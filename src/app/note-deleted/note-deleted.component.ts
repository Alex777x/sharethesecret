import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-note-deleted',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div class="glass-panel w-full max-w-lg rounded-2xl p-8 text-center transition-all duration-300">
        <div
          class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 mb-6"
        >
          <svg
            class="w-10 h-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            ></path>
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Secret Not Found
        </h1>

        <p class="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
          This secret has been deleted, expired, or never existed. The link is no
          longer valid.
        </p>

        <button
          (click)="goToHome()"
          class="btn-primary px-8 py-3 rounded-xl font-semibold shadow-lg text-lg"
        >
          Create New Secret
        </button>
      </div>
    </main>
  `,
  styles: [],
})
export class NoteDeletedComponent {
  constructor(private router: Router) { }

  goToHome(): void {
    this.router.navigate(['/']);
  }
}
