

import { Component, signal, effect } from '@angular/core';
import { SearhIconComponent } from '@/icons/SearchIcon.component';
import { playlists, songs, type Playlist } from '@/lib/data';
import { ExploreIconComponent } from '@/icons/Explore.component';
// interface Item {
//     id: string;
//     title: string;
//     type?: 'playlist' | 'song';
//   }

@Component({
    selector: 'selector-name',
    standalone: true, 
    template: `
<div class="relative w-[477px]">
  <div
    class="flex items-center gap-1 bg-zinc-900 rounded-full px-3 py-3
           focus-within:border focus-within:border-white hover:bg-zinc-800
           transition-all duration-200">

    <SearchIcon class="w-5 h-5 text-zinc-400 transition-colors duration-200 focus-within:text-white" />

    <input
      type="text"
      placeholder="What do you want to play?"
      [value]="query()"
      (input)="query.set($any($event.target).value)"
      class="bg-transparent outline-none text-1xl text-white placeholder-zinc-500 flex-1"
    />

    <div class="flex items-center gap-3">
        <div class="w-px h-6 bg-gray-400"></div>
        <ExploreIcon />
      </div>
  </div>
  


  
  @if (filtered().length > 0) {
        <div class="absolute left-0 top-full mt-2 w-full bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg max-h-60 overflow-auto z-50">
          <h3 class="text-white font-bold px-4 py-2 ">Searching</h3>
          <ul>
            @for (item of filtered(); track $index) {
              <li
                (click)="selectItems(item)"
                class="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-zinc-700">
              <picture class="h-12 w-12 flex-none">
                  @if(item.cover){
                      <img [src]="item.cover" [alt]="item.title" class="h-12 w-12 rounded-md" />
  
                  }@else  {
  
                      <img [src]="item.image" [alt]="item.title" class="h-12 w-12 rounded-md" />
                  }
              </picture>
            
              <div>
              <h4 class="text-white text-lm">{{ item.title }}</h4>
              <span class="text-sm text-gray-400"> {{ item.artists.join(', ') }} </span>
              </div>
              </li>
            }
          </ul>
        </div>
      }
</div>


    `,
    imports: [SearhIconComponent, ExploreIconComponent]
})

export class SearchBarComponent  {

    playlists = signal(playlists);
    songs = signal(songs);
  
    query = signal('');
    filtered = signal<Playlist[]>([]);
  
    filterItems(val: string) {
        const query = val.toLowerCase().trim();
      
        if (!query) {
          this.filtered.set([]);
          return;
        }
      
        const results: any[] = [...this.playlists(), ...this.songs()]
          .filter(item => item.title.toLowerCase().includes(query));

        const uniqueResults: any[] = results.filter(
            (item, index, self) => self.findIndex(i => i.id === item.id) === index
          );

      
        this.filtered.set(uniqueResults);
      }
      
    filterItem = effect(() => {
        this.filterItems(this.query());
      });
  
    selectItems(item: Playlist) {
      this.query.set(item.title);
      this.filtered.set([]);
    }
    
}