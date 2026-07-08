import { companyFilter } from './company-scope.util';

describe('companyFilter', () => {
  it('returns an empty filter for Super Admin', () => {
    expect(companyFilter({ role: 'Super Admin', companyId: 'anything' })).toEqual({});
  });

  it('returns a companyId filter for non-Super-Admin roles', () => {
    expect(companyFilter({ role: 'admin', companyId: 'company-123' })).toEqual({ companyId: 'company-123' });
    expect(companyFilter({ role: 'operator', companyId: 'company-123' })).toEqual({ companyId: 'company-123' });
    expect(companyFilter({ role: 'viewer', companyId: 'company-123' })).toEqual({ companyId: 'company-123' });
  });
});
