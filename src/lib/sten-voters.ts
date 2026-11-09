import { WEDDING_PARTY } from './wedding-party';
import { WEDDING } from './wedding-info';

// The five couples on /party, plus the couple hosting the weekend.
export const STEN_VOTERS = [
    ...WEDDING.coupleName.split(' & '),
    ...WEDDING_PARTY.flatMap(couple => couple.members.map(member => member.name))
];
