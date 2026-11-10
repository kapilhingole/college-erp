import { prisma } from '../config';

export interface ZprnConfig {
  prefix: string;
  nextNumber: number;
  padding: number;
  nextZprn: string;
}

export class ZprnService {
  private static PREFIX_KEY = 'ZPRN_PREFIX';
  private static NEXT_NUMBER_KEY = 'ZPRN_NEXT_NUMBER';
  private static PADDING_KEY = 'ZPRN_PADDING';

  /**
   * Formats a ZPRN from prefix, number, and padding
   */
  static formatZprn(prefix: string, num: number, padding: number): string {
    const numStr = String(num);
    const padded = numStr.length >= padding ? numStr : numStr.padStart(padding, '0');
    return `${prefix.trim().toUpperCase()}${padded}`;
  }

  /**
   * Retrieves current ZPRN sequence settings, creating defaults if not initialized
   */
  static async getConfig(): Promise<ZprnConfig> {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [this.PREFIX_KEY, this.NEXT_NUMBER_KEY, this.PADDING_KEY],
        },
      },
    });

    const map = new Map(settings.map((s) => [s.key, s.value]));

    let prefix = map.get(this.PREFIX_KEY);
    let nextNumber = map.get(this.NEXT_NUMBER_KEY) ? parseInt(map.get(this.NEXT_NUMBER_KEY)!, 10) : NaN;
    let padding = map.get(this.PADDING_KEY) ? parseInt(map.get(this.PADDING_KEY)!, 10) : NaN;

    let needsSave = false;

    if (!prefix) {
      prefix = 'ZPRN';
      needsSave = true;
    }

    if (isNaN(nextNumber) || nextNumber <= 0) {
      // Default to 240001 (representing AY 2024, starting from 0001)
      nextNumber = 240001;
      needsSave = true;
    }

    if (isNaN(padding) || padding < 3) {
      padding = 5;
      needsSave = true;
    }

    if (needsSave) {
      await this.saveConfigInternal(prefix, nextNumber, padding);
    }

    return {
      prefix,
      nextNumber,
      padding,
      nextZprn: this.formatZprn(prefix, nextNumber, padding),
    };
  }

  /**
   * Internal helper to upsert settings
   */
  private static async saveConfigInternal(prefix: string, nextNumber: number, padding: number, tx: any = prisma) {
    await tx.systemSetting.upsert({
      where: { key: this.PREFIX_KEY },
      create: { key: this.PREFIX_KEY, value: prefix.trim().toUpperCase(), category: 'ADMISSIONS' },
      update: { value: prefix.trim().toUpperCase() },
    });

    await tx.systemSetting.upsert({
      where: { key: this.NEXT_NUMBER_KEY },
      create: { key: this.NEXT_NUMBER_KEY, value: String(nextNumber), category: 'ADMISSIONS' },
      update: { value: String(nextNumber) },
    });

    await tx.systemSetting.upsert({
      where: { key: this.PADDING_KEY },
      create: { key: this.PADDING_KEY, value: String(padding), category: 'ADMISSIONS' },
      update: { value: String(padding) },
    });
  }

  /**
   * Allows Management or Admin to set the starting ZPRN counter and prefix
   */
  static async updateConfig(params: {
    prefix?: string;
    startNumber?: number;
    padding?: number;
  }): Promise<ZprnConfig> {
    const current = await this.getConfig();

    const prefix = params.prefix?.trim().toUpperCase() || current.prefix;
    const nextNumber = params.startNumber !== undefined && params.startNumber > 0 ? params.startNumber : current.nextNumber;
    const padding = params.padding !== undefined && params.padding >= 3 ? params.padding : current.padding;

    await this.saveConfigInternal(prefix, nextNumber, padding);

    return {
      prefix,
      nextNumber,
      padding,
      nextZprn: this.formatZprn(prefix, nextNumber, padding),
    };
  }

  /**
   * Atomically allocates the next available ZPRN, guaranteeing uniqueness and updating the counter
   */
  static async allocateNextZprn(tx: any = prisma): Promise<string> {
    // 1. Fetch current config
    const prefixSetting = await tx.systemSetting.findUnique({ where: { key: this.PREFIX_KEY } });
    const numSetting = await tx.systemSetting.findUnique({ where: { key: this.NEXT_NUMBER_KEY } });
    const padSetting = await tx.systemSetting.findUnique({ where: { key: this.PADDING_KEY } });

    const prefix = prefixSetting?.value || 'ZPRN';
    let currentNum = numSetting?.value ? parseInt(numSetting.value, 10) : 240001;
    const padding = padSetting?.value ? parseInt(padSetting.value, 10) : 5;

    let candidate = this.formatZprn(prefix, currentNum, padding);

    // Ensure candidate doesn't collide with existing student enrollment number
    // If it does, skip forward until a unique one is found
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await tx.student.findUnique({
        where: { enrollmentNumber: candidate },
        select: { id: true },
      });

      if (!existing) {
        break;
      }
      currentNum++;
      candidate = this.formatZprn(prefix, currentNum, padding);
    }

    // Save the NEXT number after this allocated candidate
    const nextNum = currentNum + 1;
    await tx.systemSetting.upsert({
      where: { key: this.NEXT_NUMBER_KEY },
      create: { key: this.NEXT_NUMBER_KEY, value: String(nextNum), category: 'ADMISSIONS' },
      update: { value: String(nextNum) },
    });

    return candidate;
  }
}

