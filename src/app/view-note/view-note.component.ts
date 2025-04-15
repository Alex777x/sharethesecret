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
    try {
      const id = this.route.snapshot.paramMap.get('id');
      if (!id) {
        this.error.set('Invalid note ID');
        return;
      }

      // Parse URL hash for encryption key and algorithm
      const hash = window.location.hash.substring(1);
      if (hash) {
        const [keyBase64, algorithm] = hash.split(':');
        this.algorithm.set((algorithm || 'AES-GCM') as Algorithm);

        // Convert base64 key to ArrayBuffer and import it
        const keyBuffer = Uint8Array.from(atob(keyBase64), (c) =>
          c.charCodeAt(0)
        );
        const key = await window.crypto.subtle.importKey(
          'raw',
          keyBuffer,
          { name: this.algorithm(), length: 256 },
          false,
          ['decrypt']
        );
        this.encryptionKey.set(key);
      }

      await this.loadNote(id);
    } catch (error) {
      console.error('Error initializing note view:', error);
      this.error.set('Failed to load note');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadNote(id: string): Promise<void> {
    try {
      const response = await this.noteService.getNote(id).toPromise();
      this.note.set(response || null);

      if (this.note()?.hasPassword && !this.password()) {
        // Wait for password input
        return;
      }

      if (this.note()) {
        await this.decryptNote();

        // If TTL is 1-view, delete the note after viewing
        if (this.note()?.ttl === '1-view') {
          await this.deleteNote();
        }
      }
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 403) {
        this.error.set('Incorrect password');
      } else {
        console.error('Error loading note:', error);
        this.error.set('Failed to load note');
      }
    }
  }

  private async decryptNote(): Promise<void> {
    const note = this.note();
    const key = this.encryptionKey();
    if (!note || !key) return;

    try {
      if (note.content && note.content_iv) {
        const contentBuffer = new TextEncoder().encode(note.content).buffer;
        const decryptedBuffer = await this.cryptoService.decryptData(
          contentBuffer as ArrayBuffer,
          key,
          note.content_iv,
          this.algorithm() as Algorithm
        );
        this.decryptedContent.set(new TextDecoder().decode(decryptedBuffer));
      }

      if (note.file && note.file_iv) {
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
      }
    } catch (error) {
      console.error('Error decrypting note:', error);
      this.error.set('Failed to decrypt note');
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
