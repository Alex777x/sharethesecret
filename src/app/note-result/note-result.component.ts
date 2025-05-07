import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { NoteService } from '../services/note.service';
import { LinkStoreService } from '../services/link-store.service';

@Component({
  selector: 'app-note-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './note-result.component.html',
  styleUrl: './note-result.component.css',
})
export class NoteResultComponent implements OnInit {
  @Input() set link(value: string) {
    this.linkSignal.set(value);
  }
  @Output() delete = new EventEmitter<void>();

  linkSignal = signal<string>('');
  isCopied = signal<boolean>(false);
  router = inject(Router);
  route = inject(ActivatedRoute);
  noteService = inject(NoteService);
  linkStore = inject(LinkStoreService);

  ngOnInit(): void {
    // First check if there's an input link
    if (!this.linkSignal()) {
      // If no input link, try to get from navigation state
      const navigation = this.router.getCurrentNavigation();
      if (navigation?.extras.state && 'link' in navigation.extras.state) {
        this.linkSignal.set(navigation.extras.state['link'] as string);
      } else {
        // If no navigation state, try to get from service
        const storedLink = this.linkStore.getLink();
        if (storedLink) {
          this.linkSignal.set(storedLink);
        }
      }
    }
  }

  copyToClipboard(): void {
    navigator.clipboard
      .writeText(this.linkSignal())
      .then(() => {
        this.isCopied.set(true);
        setTimeout(() => this.isCopied.set(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
      });
  }

  testLink(): void {
    if (this.linkSignal()) {
      window.open(this.linkSignal(), '_blank');
    }
  }

  onDelete(): void {
    if (this.router.url.includes('result')) {
      // We're in the standalone route, extract ID and delete
      const link = this.linkSignal();
      if (!link) return;

      // Extract note ID from the URL
      const match = link.match(/\/note\/([^#]+)/);
      if (!match) return;

      const noteId = match[1];
      this.noteService.deleteNote(noteId).subscribe({
        next: () => {
          this.router.navigate(['/deleted']);
        },
        error: (err) => {
          console.error('Failed to delete note:', err);
        },
      });
    } else {
      // We're in the embedded component
      this.delete.emit();
    }
  }

  createNew(): void {
    this.router.navigate(['/']);
  }
}
