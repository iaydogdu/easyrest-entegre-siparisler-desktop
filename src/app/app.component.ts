import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="app-container">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .app-container {
      height: 100vh;
      width: 100vw;
      overflow: hidden;
    }
  `]
})
export class AppComponent implements OnInit {
  title = 'EasyRest Entegre Siparişler';

  constructor(private translate: TranslateService) {
    this.translate.setDefaultLang('tr');
    this.translate.use('tr');
  }

  ngOnInit() {
    console.log('EasyRest Entegre Siparişler uygulaması başlatıldı');
  }
}
