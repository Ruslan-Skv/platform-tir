import type { RemontKvartirGroupDef } from '../types';
import { GROUP_STENY } from './01-steny';
import { GROUP_POTOLKI } from './02-potolki';
import { GROUP_POLY } from './03-poly';
import { GROUP_DVERI_PROEMY } from './04-dveri-proemy';
import { GROUP_OKNA_BALKONY } from './05-okna-balkony';
import { GROUP_SANTEHNIKA } from './06-santehnika';
import { GROUP_ELEKTRIKA } from './07-elektrika';
import { GROUP_PLITKA_KAMEN } from './08-plitka-kamen';
import { GROUP_MALYAR_DEKOR } from './09-malyar-dekor';
import { GROUP_NATYAZHNYE_POTOLKI } from './10-natyazhnye-potolki';
import { GROUP_ZHALJUZI } from './11-zhaljuzi';
import { GROUP_PROCHIE } from './12-prochie';

/** Полный каталог: 12 корневых групп → подкатегории → позиции */
export const REMONT_KVARTIR_GROUPS: RemontKvartirGroupDef[] = [
  GROUP_STENY,
  GROUP_POTOLKI,
  GROUP_POLY,
  GROUP_DVERI_PROEMY,
  GROUP_OKNA_BALKONY,
  GROUP_SANTEHNIKA,
  GROUP_ELEKTRIKA,
  GROUP_PLITKA_KAMEN,
  GROUP_MALYAR_DEKOR,
  GROUP_NATYAZHNYE_POTOLKI,
  GROUP_ZHALJUZI,
  GROUP_PROCHIE,
];
