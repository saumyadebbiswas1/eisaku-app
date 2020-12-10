import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { InoutComponent } from './inout.component';

describe('InoutComponent', () => {
  let component: InoutComponent;
  let fixture: ComponentFixture<InoutComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InoutComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(InoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
