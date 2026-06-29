import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface HourlyStat {
  time: string;
  count: number;
  percentage: number;
}

export interface DailyAnalyticsReport {
  date: string;
  totalReservations: number;
  totalPax: number;
  attendanceRate: number;
  hourlyData: HourlyStat[];
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

  public readonly selectedDate = signal<string>(formatDate(new Date(), 'yyyy-MM-dd', 'en-US'));
  public readonly isLoading = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly totalReservations = signal<number>(0);
  public readonly totalPax = signal<number>(0);
  public readonly attendanceRate = signal<number>(0);
  public readonly hourlyData = signal<HourlyStat[]>([]);

  public readonly hasHourlyData = computed(() => this.hourlyData().length > 0);

  public ngOnInit(): void {
    this.loadAnalyticsReport();
  }

  public loadAnalyticsReport(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const params = new HttpParams().set('date', this.selectedDate());

    this.http.get<DailyAnalyticsReport>(`${environment.apiUrl}/restaurants/analytics`, { params })
      .subscribe({
        next: (report) => {
          this.totalReservations.set(report.totalReservations ?? 0);
          this.totalPax.set(report.totalPax ?? 0);
          this.attendanceRate.set(report.attendanceRate ?? 0);
          this.hourlyData.set(report.hourlyData ?? []);
          this.isLoading.set(false);
        },
        error: (error: unknown) => {
          console.error('Error al cargar reporte de ocupación:', error);
          this.totalReservations.set(0);
          this.totalPax.set(0);
          this.attendanceRate.set(0);
          this.hourlyData.set([]);
          this.errorMessage.set('No se pudo cargar el reporte desde la API.');
          this.isLoading.set(false);
        }
      });
  }

  public onDateChange(date: string): void {
    this.selectedDate.set(date);
    this.loadAnalyticsReport();
  }

  public onPrintReport(): void {
    window.print();
  }
}
