export interface CsvData {
  headers: string[];
  rows: string[][];
  rawText: string;
}

export enum ProcessingState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface FileData {
  name: string;
  size: number;
  type: string;
  base64: string;
}

