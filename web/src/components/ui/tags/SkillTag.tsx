interface SkillTagProps{
    skill: string;
};

export default function SkillTag({ skill }: SkillTagProps) {
  return (
    <span className="bg-shade-background px-3 py-0.5 rounded-full text-xs font-normal leading-5">
      {skill}
    </span>
  );
}