import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-note-result',
  templateUrl: './note-result.component.html',
  styleUrls: ['./note-result.component.css']
})
export class NoteResultComponent {
  @Input() link: string = '';

  copyLink(): void {
    navigator.clipboard.writeText(this.link).then(() => {
      alert('Ссылка скопирована в буфер обмена!');
    });
  }
}
