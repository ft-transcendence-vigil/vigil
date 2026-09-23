interface Data {
  tagline: string;
  title: {
    white: string;
    blue: string;
  };
  caption: string;
  features: {
    one: string;
    two: string;
    three: string;
  };
}

export default function Branding({ tagline, title, caption, features }: Data) {
  return (
    <div className="content w-full lg:w-125">
      <p className="tagline">{tagline}</p>
      <h1 className="title">
        {title.white}
        <span className="text-vigil-cyan"> {title.blue}</span>
      </h1>
      <p className="caption">{caption}</p>
      <ul className="features">
        <li>
          <span className="dot"></span> {features.one}
        </li>
        <li>
          <span className="dot"></span> {features.two}
        </li>
        <li>
          <span className="dot"></span> {features.three}
        </li>
      </ul>
    </div>
  );
}
