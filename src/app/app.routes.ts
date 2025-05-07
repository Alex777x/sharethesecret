import { Routes } from '@angular/router';
import { CreateNoteComponent } from './create-note/create-note.component';
import { ViewNoteComponent } from './view-note/view-note.component';
import { NoteResultComponent } from './note-result/note-result.component';
import { NoteDeletedComponent } from './note-deleted/note-deleted.component';

export const routes: Routes = [
  { path: '', component: CreateNoteComponent },
  { path: 'note/:id', component: ViewNoteComponent },
  { path: 'result', component: NoteResultComponent },
  { path: 'deleted', component: NoteDeletedComponent },
  { path: '**', redirectTo: '' },
];
