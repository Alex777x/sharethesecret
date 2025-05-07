import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams,
  HttpErrorResponse,
} from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface Note {
  id: string;
  content?: string;
  file?: {
    name: string;
    data: ArrayBuffer;
  };
  hasPassword: boolean;
  ttl: string;
  content_iv?: Uint8Array;
  file_iv?: Uint8Array;
}

@Injectable({ providedIn: 'root' })
export class NoteService {
  private api = `${environment.apiUrl}/notes`;
  // 2MB in bytes
  public static readonly MAX_FILE_SIZE = 2 * 1024 * 1024;

  constructor(private http: HttpClient) {}

  createNote(formData: FormData): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.api, formData).pipe(
      catchError((error: HttpErrorResponse) => {
        if (
          error.status === 413 ||
          (error.error?.message &&
            error.error.message.includes('Maximum upload size exceeded'))
        ) {
          return throwError(
            () => new Error('File size exceeds the maximum limit of 2MB')
          );
        }
        return throwError(() => error);
      })
    );
  }

  getNote(id: string, password?: string) {
    let params = new HttpParams();
    if (password) {
      params = params.set('password', password);
    }
    return this.http.get<Note>(`${this.api}/${id}`, { params });
  }

  deleteNote(id: string) {
    return this.http.delete(`${this.api}/${id}`);
  }
}
