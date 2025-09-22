import { SupabaseClient } from '@supabase/supabase-js';
import { handleInterest } from './handle-interest';

describe('handleInterest', () => {
  const script = {
    id: 'script-1',
    title: 'Test Script',
    owner_id: 'writer-1',
  } as const;

  const createSupabaseMock = (
    upsertImplementation: jest.Mock<Promise<{ error: Error | null }>, any>
  ) => {
    const getUser = jest.fn().mockResolvedValue({
      data: { user: { id: 'producer-1' } },
      error: null,
    });

    return {
      auth: { getUser },
      from: jest.fn().mockReturnValue({ upsert: upsertImplementation }),
    } as unknown as SupabaseClient;
  };

  it('emits a success toast when the interest endpoint succeeds', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    const supabase = createSupabaseMock(upsert);
    const notifyWriter = jest.fn().mockResolvedValue(true);
    const showToast = jest.fn();
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    await handleInterest(script, {
      supabase,
      notifyWriterOfInterest: notifyWriter,
      showToast,
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/interest',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(upsert).toHaveBeenCalled();
    expect(notifyWriter).toHaveBeenCalledWith({
      writerId: script.owner_id,
      script,
      producerId: 'producer-1',
    });
    expect(showToast).toHaveBeenCalledWith(
      'success',
      expect.stringContaining('Senarist bilgilendirildi')
    );
  });

  it('emits an error toast when both the endpoint and fallback fail', async () => {
    const upsert = jest
      .fn()
      .mockResolvedValue({ error: new Error('veritabanı erişilemiyor') });
    const supabase = createSupabaseMock(upsert);
    const showToast = jest.fn();

    await expect(
      handleInterest(script, {
        supabase,
        notifyWriterOfInterest: jest.fn(),
        showToast,
        fetchImpl: jest.fn().mockRejectedValue(new Error('ağ hatası')),
      })
    ).rejects.toThrow('veritabanı erişilemiyor');

    expect(showToast).toHaveBeenCalledWith(
      'error',
      expect.stringContaining('veritabanı erişilemiyor')
    );
  });
});
