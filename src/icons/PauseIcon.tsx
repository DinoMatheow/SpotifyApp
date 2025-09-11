export const PauseIcon = ({className}:{className:string}) => {
  return (
    <svg  role="img" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" 
    className={`${className} text-black`}>
      <path
        d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"
      ></path>
    </svg>
  );
};