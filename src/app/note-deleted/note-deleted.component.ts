import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-note-deleted',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="bg-white dark:bg-gray-900 min-h-[80vh]">
      <div class="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-lg text-center">
          <h1
            class="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl"
          >
            Note Deleted
          </h1>

          <p class="mt-4 text-gray-600 dark:text-gray-400">
            The note has been deleted or its validity period has expired.
          </p>

          <button
            (click)="goToHome()"
            class="mt-8 inline-block rounded-lg bg-teal-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-teal-700 focus:outline-none focus:ring"
          >
            Create New Secret
          </button>
        </div>
      </div>
    </main>
  `,
  styles: [],
})
export class NoteDeletedComponent {
  constructor(private router: Router) {}

  goToHome(): void {
    this.router.navigate(['/']);
  }
}
