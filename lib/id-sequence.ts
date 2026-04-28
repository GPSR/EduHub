type SchoolIdFormatConfig = {
  idSequencePad: number;
};

function pad(num: number, width: number) {
  const s = String(num);
  return s.length >= width ? s : "0".repeat(width - s.length) + s;
}

export function formatSchoolId({
  school,
  format,
  seq
}: {
  school: SchoolIdFormatConfig;
  format: string;
  seq: number;
}) {
  const yyyy = String(new Date().getFullYear());
  const seqStr = pad(seq, school.idSequencePad || 0);
  return format.replaceAll("{YYYY}", yyyy).replaceAll("{SEQ}", seqStr);
}
