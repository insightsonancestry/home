import ServicesIcon from '../assets/icons/servicesIcon.svg';
import { Feature } from './Feature';
const features = [

  {
    title: 'Admixture Modelling - $33',
    description: 'Admixture modeling using qpAdm which is the gold standard according to academics for precise ancestry composition analysis. In instances where the customer’s ethnic group has been successfully modeled in academic research, the same model will be utilized. If such a model is not available, a rotating strategy will be employed to identify the most suitable model.',
  },
  {
    title: 'PCA Analysis - $20',
    description: 'Principal Component Analysis with smartPCA for in-depth population structure insights.',
  },
  {
    title: 'Y-Haplogroup Calls - $20',
    description: 'Manual Y-haplogroup calls to trace paternal lineage.',
  },
  {
    title: 'Custom Dataset Curation - $50',
    description: 'Curating custom datasets by integrating publicly available academic samples with personal samples for amateur population genetics enthusiasts.',
  },
  {
    title: 'Raw file conversion - $10',
    description: 'Converting raw files from companies like AncestryDNA, LivingDNA, Family Tree DNA and Mapmygenome into the widely used 23andme format.',
  },
  {
    title: 'Extracting raw files of ancient DNA samples - $5',
    description: 'Extracting 23andme format raw files of ancient DNA samples in the Harvard AADR dataset.',
  }
];

export const Features = () => {
  return (
    <section id="features">
    <div className="bg-black text-white py-[72px] sm:py-24">
      <div className="container">
        <h2 className="text-center font-bold text-5xl sm:text-6xl tracking-tighter">Everything you need to know</h2>
        <div className="max-w-xl mx-auto">
        <p className="text-center mt-5 text-xl text-white/70">
        This section highlights the benefits of our services, helping customers understand how our offerings can enhance their research and guide their decisions.
        </p>
        </div>
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {features.map(({ title, description }) => (
            <Feature title={title} description={description} key={title} />
          ))}
        </div>
      </div>
    </div>
    </section>
  );
};