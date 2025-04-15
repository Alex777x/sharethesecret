import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoteService } from '../services/note.service';
import { CryptoService, Algorithm } from '../services/crypto.service';
import { NoteResultComponent } from '../note-result/note-result.component';

@Component({
  selector: 'app-create-note',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NoteResultComponent,
  ],
  templateUrl: './create-note.component.html',
  styleUrl: './create-note.component.css',
})
export class CreateNoteComponent {
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

  // Constants
  readonly MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

  // Computed signal for form validity
  isFormValid = computed(() => {
    return (this.content() || this.selectedFile()) && !this.fileError();
  });

  private noteService = inject(NoteService);
  private cryptoService = inject(CryptoService);

  constructor() {}

  private validateFile(file: File): boolean {
    if (file.size > this.MAX_FILE_SIZE) {
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
      if (this.validateFile(file)) {
        this.selectedFile.set(file);
      }
    } else {
      this.selectedFile.set(null);
      this.fileError.set(null);
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
    if (!this.isFormValid()) return;

    const formData = new FormData();
    let key: CryptoKey | null = null;
    let encryptedContent: { encrypted: ArrayBuffer; iv: Uint8Array } | null =
      null;
    let encryptedFile: { encrypted: ArrayBuffer; iv: Uint8Array } | null = null;

    try {
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

      this.noteService.createNote(formData).subscribe({
        next: async (response) => {
          const baseUrl = window.location.origin;
          let url = `${baseUrl}/note/${response.id}`;

          // If encryption was used, append the key to the URL
          if (key) {
            const keyFormat = this.algorithm() === 'RSA-OAEP' ? 'pkcs8' : 'raw';
            const rawKey = await this.cryptoService.exportKey(key, keyFormat);
            const keyBase64 = btoa(
              String.fromCharCode(...new Uint8Array(rawKey))
            );
            url += `#${keyBase64}:${this.algorithm().toLowerCase()}`;
          }

          this.generatedLink.set(url);
        },
        error: (err) => {
          console.error('Failed to create note:', err);
        },
      });
    } catch (error) {
      console.error('Encryption error:', error);
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
      },
      error: (err) => {
        console.error('Failed to delete note:', err);
      },
    });
  }
}
