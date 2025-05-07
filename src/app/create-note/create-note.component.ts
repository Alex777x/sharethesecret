import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoteService } from '../services/note.service';
import { CryptoService, Algorithm } from '../services/crypto.service';
import { NoteResultComponent } from '../note-result/note-result.component';
import { Router, ActivatedRoute } from '@angular/router';
import { LinkStoreService } from '../services/link-store.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-create-note',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
],
  templateUrl: './create-note.component.html',
  styleUrl: './create-note.component.css',
})
export class CreateNoteComponent implements OnInit {
  // Form signals
  content = signal<string>('');
  algorithm = signal<Algorithm | 'No-Encryption'>('No-Encryption');
  ttl = signal<string>('1-view');
  password = signal<string>('');

  // Other signals
  generatedLink = signal<string | null>(null);
  selectedFile = signal<File | null>(null);
  showOptions = signal<boolean>(false);
  isDragging = signal<boolean>(false);
  fileError = signal<string | null>(null);
  errorMessage = signal<string>('');
  isSubmitting = signal<boolean>(false);

  // Computed signal for form validity
  isFormValid = computed(() => {
    return (this.content() || this.selectedFile()) && !this.fileError();
  });

  private noteService = inject(NoteService);
  private cryptoService = inject(CryptoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private linkStore = inject(LinkStoreService);

  private validateFile(file: File): boolean {
    if (file.size > NoteService.MAX_FILE_SIZE) {
      this.fileError.set('File size exceeds 2MB limit');
      return false;
    }
    this.fileError.set(null);
    return true;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (this.validateFile(file)) {
        this.selectedFile.set(file);
      }
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Check file size before proceeding
      if (file.size > NoteService.MAX_FILE_SIZE) {
        // Use fileError for consistency with drag-and-drop validation
        this.fileError.set(
          `File size exceeds the maximum limit of ${
            NoteService.MAX_FILE_SIZE / (1024 * 1024)
          }MB`
        );
        this.selectedFile.set(null);
        this.errorMessage.set(''); // Clear general error message if file specific error occurs
        input.value = ''; // Clear the file input
        return;
      }

      this.selectedFile.set(file);
      this.fileError.set(null); // Clear file specific error
      this.errorMessage.set(''); // Clear general error message
    }
  }

  removeFile(): void {
    this.selectedFile.set(null);
    this.fileError.set(null);
    // Reset the file input
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onClickShowOptions(): void {
    this.showOptions.update((prev) => !prev);
  }

  async onSubmit(): Promise<void> {
    // Ensure fileError is also checked if a file is selected
    if (this.isSubmitting() || (this.selectedFile() && this.fileError()))
      return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    // Clear fileError as well before submission attempt, as it's for UI feedback during selection
    this.fileError.set(null);

    try {
      const formData = new FormData();
      let key: CryptoKey | null = null;
      let encryptedContent: { encrypted: ArrayBuffer; iv: Uint8Array } | null =
        null;
      let encryptedFile: { encrypted: ArrayBuffer; iv: Uint8Array } | null =
        null;

      // Generate encryption key if encryption is enabled
      if (this.algorithm() !== 'No-Encryption') {
        const currentAlgorithm = this.algorithm() as Algorithm;
        switch (currentAlgorithm) {
          case 'AES-GCM':
            key = await this.cryptoService.generateAesKey();
            break;
          case 'RSA-OAEP':
            const rsaKeyPair = await this.cryptoService.generateRsaKeyPair();
            key = rsaKeyPair.privateKey;
            const publicKeyBuffer = await this.cryptoService.exportKey(
              rsaKeyPair.publicKey,
              'spki'
            );
            formData.append('public_key', new Blob([publicKeyBuffer]));
            break;
          case 'ECDH':
            const ecdhKeyPair = await this.cryptoService.generateEcdhKeyPair();
            key = ecdhKeyPair.privateKey;
            const ecdhPublicKeyBuffer = await this.cryptoService.exportKey(
              ecdhKeyPair.publicKey,
              'spki'
            );
            formData.append('public_key', new Blob([ecdhPublicKeyBuffer]));
            break;
        }

        // Encrypt content if provided
        if (this.content().trim()) {
          if (key) {
            encryptedContent = await this.cryptoService.encryptData(
              this.content(),
              key,
              currentAlgorithm
            );
            formData.append('content', new Blob([encryptedContent.encrypted]));
            formData.append('content_iv', new Blob([encryptedContent.iv]));
          } else {
            formData.append('content', this.content());
          }
        }

        // Encrypt file if provided
        if (this.selectedFile()) {
          const file = this.selectedFile() as File;
          const fileBuffer = await file.arrayBuffer();

          if (key) {
            encryptedFile = await this.cryptoService.encryptData(
              fileBuffer,
              key,
              currentAlgorithm
            );
            formData.append('file', new Blob([encryptedFile.encrypted]));
            formData.append('file_iv', new Blob([encryptedFile.iv]));
          } else {
            formData.append('file', file);
          }
        }
      } else {
        // No encryption case
        if (this.content().trim()) {
          formData.append('content', this.content());
        }
        if (this.selectedFile()) {
          formData.append('file', this.selectedFile() as File);
        }
      }

      formData.append('algorithm', this.algorithm());
      formData.append('ttl', this.ttl());
      formData.append('password', this.password());

      const response = await firstValueFrom(
        this.noteService.createNote(formData)
      );

      // Create and store the complete URL with encryption key if present
      const baseUrl = window.location.origin;
      let url = `${baseUrl}/note/${response.id}`;

      // If encryption was used, append the key to the URL hash
      if (key && this.algorithm() !== 'No-Encryption') {
        const keyFormat = this.algorithm() === 'RSA-OAEP' ? 'pkcs8' : 'raw';
        const rawKey = await this.cryptoService.exportKey(key, keyFormat);
        const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
        url += `#${keyBase64}:${this.algorithm()}`;
      }

      // Store the complete URL
      this.linkStore.setLink(url);
      this.router.navigate(['/result']);
    } catch (error: any) {
      console.error('Error creating note:', error);
      this.errorMessage.set(
        error.message || 'Failed to create note. Please try again.'
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onDeleteNote(): void {
    const link = this.generatedLink();
    if (!link) return;

    // Extract note ID from the URL
    const match = link.match(/\/note\/([^#]+)/);
    if (!match) return;

    const noteId = match[1];
    this.noteService.deleteNote(noteId).subscribe({
      next: () => {
        this.generatedLink.set(null);
        this.router.navigate(['/deleted']);
      },
      error: (err) => {
        console.error('Failed to delete note:', err);
      },
    });
  }
}
