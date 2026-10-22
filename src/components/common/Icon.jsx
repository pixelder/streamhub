export default function Icon({ name, regular = false, ...props }) {
  return <i
    class={`${regular ? 'fa-regular' : 'fa-solid'} fa-${name}`}
    aria-hidden="true"
    {...props}
  />;
}
