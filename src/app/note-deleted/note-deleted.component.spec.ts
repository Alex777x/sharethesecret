import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoteDeletedComponent } from './note-deleted.component';

describe('NoteDeletedComponent', () => {
  let component: NoteDeletedComponent;
  let fixture: ComponentFixture<NoteDeletedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoteDeletedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoteDeletedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
