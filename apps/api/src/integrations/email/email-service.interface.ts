export interface SendEmailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

export interface IEmailService {
  /**
   * Envía un correo electrónico basado en una plantilla y un contexto de datos.
   */
  sendMail(options: SendEmailOptions): Promise<void>;

  /**
   * Envía específicamente el correo con el enlace seguro para restaurar la contraseña.
   */
  sendPasswordResetMail(
    email: string,
    restaurantName: string,
    resetLink: string,
  ): Promise<void>;
}
