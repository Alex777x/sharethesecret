import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoteResultComponent } from './note-result.component';

describe('NoteResultComponent', () => {
  let component: NoteResultComponent;
  let fixture: ComponentFixture<NoteResultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoteResultComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoteResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
