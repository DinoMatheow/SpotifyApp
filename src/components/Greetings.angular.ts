import { Component, computed, signal } from '@angular/core';

@Component({
    selector: 'selector-name',
    template: `
        <h1 class="text-3xl font-bold text-white"> {{ greeting() }} </h1>
    
    `
})

export class GrettingComponent {

    currentTime = signal(new Date());

    currentHour = signal(this.currentTime().getHours());

    greeting = computed(() => {
        const hour = this.currentHour();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good night';
      });
}