import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { ErrorNotificationService } from './error-notification.service';

describe('ErrorNotificationService', () => {
  let service: ErrorNotificationService;
  let messageService: jasmine.SpyObj<MessageService>;

  beforeEach(() => {
    const messageSpy = jasmine.createSpyObj('MessageService', ['add']);

    TestBed.configureTestingModule({
      providers: [
        ErrorNotificationService,
        { provide: MessageService, useValue: messageSpy },
      ],
    });

    service = TestBed.inject(ErrorNotificationService);
    messageService = TestBed.inject(MessageService) as jasmine.SpyObj<MessageService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should show error notification', () => {
    service.showError('Test Error', 'Test message');
    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Test Error',
      detail: 'Test message',
      life: 5000,
    });
  });

  it('should show warning notification', () => {
    service.showWarning('Test Warning', 'Test message');
    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'warn',
      summary: 'Test Warning',
      detail: 'Test message',
      life: 4000,
    });
  });

  it('should categorize network error (status 0)', () => {
    const error = { status: 0 };
    service.handleHttpError(error);
    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Network Error',
      detail: jasmine.any(String),
      life: 6000,
    });
  });

  it('should categorize 404 error', () => {
    const error = { status: 404, error: {} };
    service.handleHttpError(error);
    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'warn',
      summary: 'Not Found',
      detail: jasmine.any(String),
      life: 4000,
    });
  });

  it('should categorize 500 error', () => {
    const error = { status: 500 };
    service.handleHttpError(error);
    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Server Error',
      detail: jasmine.any(String),
      life: 6000,
    });
  });
});
