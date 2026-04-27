-- Add a final status option for requests that cannot proceed
ALTER TYPE "DemoRequestStatus" ADD VALUE IF NOT EXISTS 'NOT_AVAILABLE';
