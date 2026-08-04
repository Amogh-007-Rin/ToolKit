interface SkillTagProps{
    skill: string;
};

export default function SkillTag({skill}: SkillTagProps){
    return(
        <span className="bg-shade-background px-4 py-0.5 rounded-4xl">
            <p>{skill}</p>
        </span>
    );
};