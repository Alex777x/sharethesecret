import { Component } from '@angular/core';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-view-note',
  templateUrl: './view-note.component.html',
  imports: [
    NgIf
  ],
  styleUrls: ['./view-note.component.css']
})
export class ViewNoteComponent {
  content: string = ''; // Здесь будет расшифрованный контент
  isFile: boolean = false;
  fileName: string = '';
  fileUrl: string = '';

  // Метод для получения и расшифровки контента по ссылке
  // Реализуйте логику получения данных с сервера
}
