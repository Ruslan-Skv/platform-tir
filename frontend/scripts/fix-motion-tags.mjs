import fs from 'fs';

const p = 'src/views/admin/CRM/Measurements/MeasurementFormPage.tsx';
let s = fs.readFileSync(p, 'utf8');
s = s.replace(/<\/?motion>\s*\n?/g, '');

// Close article after customerCrmActions
s = s.replace(
  /(<div className=\{styles\.customerCrmActions\}>[\s\S]*?<\/div>)\s*<\/div>\s*<\/motion>\s*\n(\s*<div className=\{styles\.row\}>\s*\n\s*<label className=\{styles\.label\} htmlFor="customerName">)/,
  '$1\n            </article>\n\n            <motion>\n            <motion>\n          <motion>\n          <motion>\n          <motion>\n            <motion>\n          <motion>\n          <motion>\n          <div className={styles.blankCustomerFields}>\n$2'
);

// Remove accidental motion wrappers we may have added
s = s.replace(/\s*<\/?motion>\s*\n?/g, '');

// Fix double article close - article should close once
s = s.replace(/<\/article>\s*\n\s*<\/article>/g, '</article>');

// Close blankCustomerFields and blankSheet before measurements section
s = s.replace(
  /(<div className=\{`\$\{styles\.row\} \$\{styles\.zoneCommentMain\}`\}>[\s\S]*?<\/div>)\s*\n(\s*<section className=\{styles\.measurementsSection\}>)/,
  '$1\n          </motion>\n        </motion>\n$2'
);

s = s.replace(/\s*<\/?motion>\s*\n?/g, '');

s = s.replace(
  /(<\/div>)\n(\s*)<\/motion>\n(\s*)<\/motion>\n(\s*<section className=\{styles\.measurementsSection\}>)/,
  '$1\n          </motion>\n        </motion>\n$4'
);

s = s.replace(/\s*<\/?motion>\s*\n?/g, '');

// blankCustomerFields close + blankSheet close
s = s.replace(
  /(\s*)<\/motion>\n(\s*)<\/motion>\n(\s*<section className=\{styles\.measurementsSection\}>)/,
  '$1          </motion>\n        </motion>\n$3'
);

s = s.replace(/\s*<\/?motion>\s*\n?/g, '');

fs.writeFileSync(p, s);
console.log('done');
