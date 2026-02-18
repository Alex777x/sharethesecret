import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NoteService } from '../services/note.service';
import { CryptoService, Algorithm } from '../services/crypto.service';
import { HttpErrorResponse, HttpClientModule } from '@angular/common/http';

interface Note {
  id: string;
  content?: string;
  file?: {
    name: string;
    data: ArrayBuffer;
  };
  hasPassword: boolean;
  ttl: string;
  content_iv?: Uint8Array;
  file_iv?: Uint8Array;
}

@Component({
  selector: 'app-view-note',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './view-note.component.html',
  styleUrl: './view-note.component.css',
})
export class ViewNoteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private noteService = inject(NoteService);
  private cryptoService = inject(CryptoService);

  note = signal<Note | null>(null);
  decryptedContent = signal<string | null>(null);
  decryptedFile = signal<{ name: string; data: ArrayBuffer } | null>(null);
  password = signal<string>('');
  error = signal<string | null>(null);
  isLoading = signal<boolean>(true);
  private encryptionKey = signal<CryptoKey | null>(null);
  private algorithm = signal<Algorithm>('AES-GCM');

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    try {
      const id = this.route.snapshot.paramMap.get('id');
      if (!id) {
        this.error.set('Invalid note ID in URL.');
        this.isLoading.set(false);
        return;
      }

      // Parse URL hash for encryption key and algorithm
      const hash = window.location.hash.substring(1);
      if (hash) {
        try {
          const [keyBase64, algorithmStr] = hash.split(':');
          if (!keyBase64) {
            // If there's a hash but no key, it implies a protected note without the key provided in URL
            // This is not necessarily an error if the note itself is not encrypted or only password protected
            // We proceed to loadNote, which will determine if a key is actually needed for decryption
            console.warn(
              'Encryption key not found in URL hash, but hash fragment is present.'
            );
          } else {
            this.algorithm.set((algorithmStr || 'AES-GCM') as Algorithm);
            const keyBuffer = Uint8Array.from(atob(keyBase64), (c) =>
              c.charCodeAt(0)
            );

            let format: 'raw' | 'pkcs8' = 'raw';
            if (this.algorithm() === 'RSA-OAEP') {
              format = 'pkcs8';
            }

            const importedKey = await this.cryptoService.importKey(
              format,
              keyBuffer.buffer as ArrayBuffer,
              this.algorithm(),
              false,
              ['decrypt']
            );
            this.encryptionKey.set(importedKey);
          }
        } catch (hashError) {
          console.error('Error parsing URL hash or importing key:', hashError);
          this.error.set('Invalid or malformed encryption key in URL hash.');
          // Do not return yet, still try to load the note metadata
          // It might be a note that doesn't require this key (e.g. no-encryption or password only)
        }
      }
      // If an error occurred parsing the hash, this.error() will be set.
      // We still proceed to loadNote, which might succeed if encryption wasn't needed
      // or it will handle the missing key appropriately if it was.
      await this.loadNote(id);
    } catch (initError) {
      // Catch errors from loadNote or other unexpected issues in ngOnInit
      console.error('Error initializing note view:', initError);
      if (!this.error()) {
        // If loadNote didn't set a specific error
        this.error.set(
          'Failed to initialize note view. An unexpected error occurred.'
        );
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadNote(id: string): Promise<void> {
    try {
      // Pass the password if available
      const response = await this.noteService
        .getNote(id, this.password() || undefined)
        .toPromise();

      if (!response) {
        // Note not found, redirect to deleted page
        this.router.navigate(['/deleted']);
        return;
      }

      this.note.set(response);

      // If note has password and we don't have one yet, just wait for input
      if (this.note()?.hasPassword && !this.password()) {
        return; // User needs to enter password
      }

      // If we have a note and either no password is needed or we have a password
      if (this.note()) {
        await this.decryptNote();

        // If TTL is 1-view, delete the note AFTER viewing and if no errors occurred
        // Ensure error signal is checked *after* decryption attempt
        if (this.note()?.ttl === '1-view' && !this.error()) {
          await this.deleteNote();
        }
      }
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 403) {
          this.error.set('Incorrect password');
        } else if (error.status === 404) {
          // Note not found, redirect to deleted page
          this.router.navigate(['/deleted']);
        } else {
          console.error('Error loading note:', error);
          this.error.set('Failed to load note due to a server error.');
        }
      } else {
        // This case might be hit if toPromise() itself fails for a non-HTTP reason
        console.error('Error loading note (non-HTTP):', error);
        // It's possible an error during decryption (like a malformed key) could propagate here
        // if not caught within decryptNote itself, or if decryptNote re-throws.
        // For now, ensure decryptNote handles its own errors and sets this.error().
        if (!this.error()) {
          // If decryptNote didn't set an error, set a generic one.
          this.error.set('Failed to load or decrypt note.');
        }
      }
    }
  }

  private async decryptNote(): Promise<void> {
    const note = this.note();
    const key = this.encryptionKey();
    if (!note) return;

    // Reset error before attempting decryption
    this.error.set(null);

    try {
      if (note.content && note.content_iv) {
        if (!key) {
          this.error.set(
            'Missing decryption key in URL. Cannot decrypt content.'
          );
          return;
        }

        const contentBuffer = new TextEncoder().encode(note.content).buffer;
        const decryptedBuffer = await this.cryptoService.decryptData(
          contentBuffer as ArrayBuffer,
          key,
          note.content_iv,
          this.algorithm() as Algorithm
        );
        this.decryptedContent.set(new TextDecoder().decode(decryptedBuffer));
      } else if (note.content) {
        // Content exists but is not encrypted
        this.decryptedContent.set(note.content);
      }

      if (note.file && note.file_iv) {
        if (!key) {
          this.error.set('Missing decryption key in URL. Cannot decrypt file.');
          return;
        }

        const decryptedBuffer = await this.cryptoService.decryptData(
          note.file.data as ArrayBuffer,
          key,
          note.file_iv,
          this.algorithm() as Algorithm
        );
        this.decryptedFile.set({
          name: note.file.name,
          data: decryptedBuffer,
        });
      } else if (note.file) {
        // File exists but is not encrypted
        this.decryptedFile.set({
          name: note.file.name,
          data: note.file.data,
        });
      }
    } catch (decryptionError) {
      console.error('Error decrypting note:', decryptionError);
      this.error.set(
        'Failed to decrypt note. The key may be incorrect or data corrupted.'
      );
    }
  }

  async submitPassword(): Promise<void> {
    if (!this.note()?.id) return;

    this.isLoading.set(true);
    this.error.set(null);
    await this.loadNote(this.note()!.id);
    this.isLoading.set(false);
  }

  async deleteNote(): Promise<void> {
    const note = this.note();
    if (!note?.id) return;

    try {
      await this.noteService.deleteNote(note.id).toPromise();
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Error deleting note:', error);
      this.error.set('Failed to delete note');
    }
  }

  downloadFile(): void {
    const file = this.decryptedFile();
    if (!file) return;

    const blob = new Blob([file.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}
