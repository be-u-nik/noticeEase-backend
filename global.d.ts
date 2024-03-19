namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    PORT: string;
    MONGO_URI: string;
    JWT_SECRET: string;
    EMAIL: string;
    EMAIL_PASSWORD: string;
    ADMIN_EMAIL: string;
    ADMIN_EMAILS: string;
    ADMIN_LIST: string;
    DB_NAME: string;
    DB_HOST: string;
    DB_USER: string;
    DB_PASS: string;
  }
}
