import logoAnimation from "../assets/optimizely_logo_animation.gif";

export default function Loading() {
  return (
    <div
      style={{
        width: "100%",
        textAlign: "center",
      }}
    >
      <img
        width={"auto"}
        height={"60px"}
        src={logoAnimation}
        alt="loading..."
      />
    </div>
  );
}
