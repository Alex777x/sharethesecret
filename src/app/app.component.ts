import { Component, signal, effect } from '@angular/core';
import { HeaderComponent } from "./header/header.component";
import { CreateNoteComponent } from "./create-note/create-note.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HeaderComponent, CreateNoteComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {}