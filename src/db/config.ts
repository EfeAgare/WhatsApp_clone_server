import { Pool } from 'pg';
import 'dotenv/config';

 
export const environment = process.env.NODE_ENV || 'development';


export const dbConfig = {
  host: 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5433,
  user: process.env.BD_USER,
  password: '',
  database: process.env.DB_DATABASE,
};

if (environment === 'test') {
  dbConfig.database = process.env.DB_DATABASE_TEST
}

export let pool: Pool = new Pool(dbConfig)