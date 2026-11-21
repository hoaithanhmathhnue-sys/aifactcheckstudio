import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sha256Hex } from '../src/sha256';
import { checkLogin, normalizeUser } from '../src/auth';
import { isSurvey } from '../src/cases';

describe('sha256Hex', () => {
  it('khớp với node:crypto trên nhiều độ dài và tiếng Việt', () => {
    for (const s of ['', 'abc', 'Tiếng Việt có dấu', 'x'.repeat(55), 'y'.repeat(56), 'z'.repeat(64), '😀'.repeat(40)]) {
      expect(sha256Hex(s)).toBe(createHash('sha256').update(s).digest('hex'));
    }
  });
});

describe('đăng nhập', () => {
  it('chuẩn hóa tên: NFC, bỏ khoảng trắng thừa, không phân biệt hoa thường', () => {
    expect(normalizeUser('  A   B ')).toBe('a b');
    expect(normalizeUser('TRẦN'.normalize('NFD'))).toBe('trần');
  });
  it('nhận diện đề khảo sát (cả bản sao do giáo viên sửa)', () => {
    expect(isSurvey({ id: 'built-in-de-truoc', title: '' })).toBe(true);
    expect(isSurvey({ id: 'abc', title: 'Đề khảo sát cá nhân – ĐỀ SAU (bản sao)' })).toBe(true);
    expect(isSurvey({ id: 'built-in-ban-thao-bai1', title: 'Bản thảo mô phỏng' })).toBe(false);
  });
  it('thông tin trống hoặc sai bị từ chối', () => {
    expect(checkLogin('', '')).toBe(false);
    expect(checkLogin('khach', 'abc')).toBe(false);
    expect(checkLogin('admin', 'admin')).toBe(false);
  });
});
