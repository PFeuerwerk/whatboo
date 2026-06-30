import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface DailyOperationalStat {
  date: string;
  reservations: number;
  pax: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

export interface OperationalReport {
  from: string;
  to: string;
  totals: {
    reservations: number;
    pax: number;
    completed: number;
    cancelled: number;
    noShow: number;
    attendanceRate: number;
    cancellationRate: number;
    noShowRate: number;
  };
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  byDay: DailyOperationalStat[];
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit {
  private readonly http = inject(HttpClient);

  public readonly fromDate = signal<string>(formatDate(new Date(), 'yyyy-MM-dd', 'en-US'));
  public readonly toDate = signal<string>(formatDate(new Date(), 'yyyy-MM-dd', 'en-US'));
  public readonly isLoading = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly report = signal<OperationalReport | null>(null);

  public readonly totals = computed(() => this.report()?.totals ?? {
    reservations: 0,
    pax: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
    attendanceRate: 0,
    cancellationRate: 0,
    noShowRate: 0,
  });

  public readonly dailyData = computed(() => this.report()?.byDay ?? []);
  public readonly hasDailyData = computed(() => this.dailyData().length > 0);

  public ngOnInit(): void {
    this.loadOperationalReport();
  }

  public loadOperationalReport(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const params = new HttpParams()
      .set('from', this.fromDate())
      .set('to', this.toDate());

    this.http.get<OperationalReport>(`${environment.apiUrl}/restaurants/reports/operational`, { params })
      .subscribe({
        next: (report) => {
          this.report.set(report);
          this.isLoading.set(false);
        },
        error: () => {
          this.report.set(null);
          this.errorMessage.set('No se pudo cargar el reporte operativo desde la API.');
          this.isLoading.set(false);
        }
      });
  }

  public onFromDateChange(date: string): void {
    this.fromDate.set(date);
    if (this.toDate() < date) {
      this.toDate.set(date);
    }
    this.loadOperationalReport();
  }

  public onToDateChange(date: string): void {
    this.toDate.set(date);
    this.loadOperationalReport();
  }

  public maxDailyReservations(): number {
    return Math.max(...this.dailyData().map(day => day.reservations), 0);
  }

  public dailyPercentage(day: DailyOperationalStat): number {
    const max = this.maxDailyReservations();
    return max > 0 ? Math.round((day.reservations / max) * 100) : 0;
  }

  public onPrintReport(): void {
    window.print();
  }
}
