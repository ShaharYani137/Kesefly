import { describe, expect, it } from 'vitest';

import { answer } from '@/engine/helper';
import { EMPTY_PROFILE } from '@/engine/types';
import { STRINGS } from '@/i18n/strings';

const ask = (text: string, lang: 'en' | 'he' = 'en') => answer(text, { s: STRINGS[lang], profile: EMPTY_PROFILE, lang, watchlist: [] });

describe('helper chat explains the Lab', () => {
  it('answers Time Machine, setups, stops and day trading in both languages', () => {
    expect(ask('how does the time machine work?')).toEqual({ text: STRINGS.en.lab.helper.timeMachine });
    expect(ask('what is an opening range breakout')).toEqual({ text: STRINGS.en.lab.helper.orb });
    expect(ask('where should my stop loss go')).toEqual({ text: STRINGS.en.lab.helper.stops });
    expect(ask('is day trading a good idea')).toEqual({ text: STRINGS.en.lab.helper.dayTrading });
    expect(ask('מה זה מכונת הזמן', 'he')).toEqual({ text: STRINGS.he.lab.helper.timeMachine });
    expect(ask('מה זה מסחר יומי', 'he')).toEqual({ text: STRINGS.he.lab.helper.dayTrading });
  });
  it('still refuses to say what to buy', () => {
    expect(ask('should I buy this breakout')).toEqual({ text: STRINGS.en.helper.answers.noAdvice });
  });
});
