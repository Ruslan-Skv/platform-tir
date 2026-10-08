/*
  Дата заключения договора з/п может отсутствовать (как в Google-таблице):
  тогда договор не даёт долю «при заключении», только «при закрытии» и по доп. счетам.
*/

-- AlterTable
ALTER TABLE "salary_contracts" ALTER COLUMN "signedAt" DROP NOT NULL;
