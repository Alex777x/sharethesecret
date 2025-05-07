import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LinkStoreService {
  private linkData: string = '';

  setLink(link: string): void {
    this.linkData = link;
  }

  getLink(): string {
    return this.linkData;
  }
}
