import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'app-create-note',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './create-note.component.html',
  styleUrl: './create-note.component.css',
})
export class CreateNoteComponent {
  // Form signals
  content = signal<string>('');
  algorithm = signal<string>('No-Encryption');
  ttl = signal<string>('1-view');
  password = signal<string>('');

  // Other signals
  generatedLink = signal<string | null>(null);
  selectedFile = signal<File | null>(null);
  showOptions = signal<boolean>(false);
  isDragging = signal<boolean>(false);

  // Computed signal for form validity
  isFormValid = computed(() => {
    return this.content() || this.selectedFile();
  });

  constructor() {}

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
      this.selectedFile.set(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
    } else {
      this.selectedFile.set(null);
    }
  }

  removeFile(): void {
    this.selectedFile.set(null);
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

  onSubmit(): void {
    if (this.isFormValid()) {
      const formData = {
        content: this.content(),
        algorithm: this.algorithm(),
        ttl: this.ttl(),
        password: this.password(),
      };

      // TODO: Implement actual encryption and API call
      console.log('Form submitted:', formData);
      console.log('Selected file:', this.selectedFile());

      // For now, just generate a mock link
      this.generatedLink.set('https://secretnote.example.com/note/123456');
    }
  }
}
