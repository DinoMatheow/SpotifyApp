export const PlayIcon = ({className}: {className:string}) => {
  return (
    <svg viewBox="0 0 24 24" className={`${className} text-black`} fill="currentColor">
      <path fill="currentColor" d="M8 5.14v14l11-7-11-7z"></path>
    </svg>
  );
};

export const Prev = () => (
  <svg fill="currentColor" role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 16 16">
    <path
      d="M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v12.575a.7.7 0 0 1-1.05.607L4 9.149V14.3a.7.7 0 0 1-.7.7H1.7a.7.7 0 0 1-.7-.7V1.7a.7.7 0 0 1 .7-.7h1.6z"></path>
  </svg>
)

export const Next = () => (
  <svg fill="currentColor" role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 16 16">
    <path
      d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.107A.7.7 0 0 0 1 1.712v12.575a.7.7 0 0 0 1.05.607L12 9.149V14.3a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-1.6z"></path>
  </svg>
)