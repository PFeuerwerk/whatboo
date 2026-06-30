import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should add Authorization header when token exists', () => {
    const token = 'test-token';
    localStorage.setItem('access_token', token);

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({});
  });

  it('should not add Authorization header when token does not exist', () => {
    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should clear token and navigate to login on 401 error', () => {
    const token = 'test-token';
    localStorage.setItem('access_token', token);

    httpClient.get('/api/test').subscribe(
      () => {},
      (error) => {
        expect(error.status).toBe(401);
      },
    );

    const req = httpMock.expectOne('/api/test');
    req.flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should clear token and navigate to login on 403 error', () => {
    const token = 'test-token';
    localStorage.setItem('access_token', token);

    httpClient.get('/api/test').subscribe(
      () => {},
      (error) => {
        expect(error.status).toBe(403);
      },
    );

    const req = httpMock.expectOne('/api/test');
    req.flush(null, { status: 403, statusText: 'Forbidden' });

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should not clear token on other error statuses', () => {
    const token = 'test-token';
    localStorage.setItem('access_token', token);

    httpClient.get('/api/test').subscribe(
      () => {},
      (error) => {
        expect(error.status).toBe(500);
      },
    );

    const req = httpMock.expectOne('/api/test');
    req.flush(null, { status: 500, statusText: 'Internal Server Error' });

    expect(localStorage.getItem('access_token')).toBe(token);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should throw error after handling 401', () => {
    httpClient.get('/api/test').subscribe(
      () => fail('should have failed'),
      (error) => {
        expect(error.status).toBe(401);
      },
    );

    const req = httpMock.expectOne('/api/test');
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
  });
});
