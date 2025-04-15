import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-note-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './note-result.component.html',
  styleUrl: './note-result.component.css',
})
export class NoteResultComponent {
  @Input() set link(value: string) {
    this.linkSignal.set(value);
  }
  @Output() delete = new EventEmitter<void>();

  linkSignal = signal<string>('');

  copyToClipboard(): void {
    navigator.clipboard
      .writeText(this.linkSignal())
      .then(() => {
        // You could add a visual feedback here if needed
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
      });
  }

  onDelete(): void {
    this.delete.emit();
  }
}
