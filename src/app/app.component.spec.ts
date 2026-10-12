import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app.component';
import { AuthService } from './services/auth.service';

describe( 'AppComponent', () => {
  it( 'creates the root application component', async () => {
    await TestBed.configureTestingModule( {
      imports: [ AppComponent ],
      providers: [ provideRouter( [] ), { provide: AuthService, useValue: { user: signal( null ) } } ],
    } ).compileComponents();

    const fixture = TestBed.createComponent( AppComponent );

    expect( fixture.componentInstance ).toBeTruthy();
  } );
} );
