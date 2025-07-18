export const Banner = () => {
  return ( 
    <div className="py-3 text-center bg-[linear-gradient(to_right,rgb(12,96,208),rgb(24,22,171),rgb(83,189,227),rgb(23,28,174),rgb(112,237,239))]">
      <div className="container">
        <div className="font-medium text-black flex justify-center">
          <span className="hidden sm:inline">Introducing a completely new service - </span>
          <span className="underline underline-offset-4 font-medium">
            Insights on Ancestry
          </span>
        </div>
      </div>
    </div>
  );
};