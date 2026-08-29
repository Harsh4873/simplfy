import type { LessonOverlay } from "./types";

export const LESSON_OVERLAYS: Record<string, LessonOverlay> = {
  "stats-lrt": {
    analogy: {
      title: "Extra toppings on a pizza",
      body: "You already have a cheese pizza that people like. You add olives and chili. The likelihood-ratio test asks a rude, useful question: did those toppings actually make the pizza better enough to justify the extra fuss? If you can get back to plain cheese just by scraping the toppings off, the two pizzas are nested. If you are comparing pizza to sushi, you do not get to use this test — that is a different bake-off (AIC, Vuong, an encompassing model).",
    },
    plain: [
      "A likelihood-ratio test is not “which model is better” in general. It is “did these extra knobs earn their keep?” The simple model has to be hiding inside the fancy one: set some knobs to zero (or tie them together) and you must recover the simple model exactly.",
      "You fit both by maximum likelihood. Twice the gap between the two log-likelihood peaks is the test statistic, Λ. Under the usual regularity story, you compare Λ to a χ² curve whose degrees of freedom equal the number of extra knobs.",
      "If the gap is large relative to that χ², the extra knobs were doing real work. If not, the simple model was already enough. That is the whole trick — plus a list of times the χ² story lies (boundaries, non-nested models, mixtures).",
    ],
    whyItMatters:
      "In a TB genomics lab you are constantly asking whether lineage, an interaction, or a random effect is worth a more complicated GLM. If the models nest, write Λ and k. If they do not, do not print an LRT p-value and hope nobody notices.",
    watchFor: [
      "Non-nested mean structures (different covariates that are not restrictions of each other) are outside Wilks. Do not report an LRT there.",
      "Testing a variance at zero, a mixture weight at zero, or anything on the edge of the simplex is a boundary problem. The null is no longer a plain χ², and a naïve p-value is anti-conservative.",
      "Wald and score tests are first-order cousins, not the same finite-sample object. AIC/BIC reuse 2Δℓ with a penalty instead of a χ² tail — they are not LRTs with a different font.",
    ],
    sayBackPrompt:
      "In your own words: what question does a likelihood-ratio test ask, when are you allowed to use it, and what is Λ?",
    sayBackModel:
      "It asks whether extra parameters in a fuller model improve the maximized likelihood enough to reject the simpler model. You may use it only when the simple model is a restriction of the fancy one (nested). Λ is twice the log-likelihood gap, referred to χ² with degrees of freedom equal to the number of restrictions — unless you are on a boundary or the models do not nest.",
  },
  "stats-likelihood": {
    analogy: {
      title: "The photo is already taken",
      body: "Imagine a photograph, already shot. You cannot change the light in the room. You can only slide the camera’s settings and ask: under which settings is this exact photo the least surprising? The photo is the data. The settings are θ. Likelihood is that ‘how unsurprising is this photo?’ curve. It is not a probability distribution over cameras. Integrating it over θ without a prior is like averaging over cameras you never said you believed in.",
    },
    plain: [
      "Start with a sampling model: how would data look if the parameter were θ. Once the data arrive, freeze them. The same formula, now a function of θ, is the likelihood L(θ | y).",
      "We almost always work with ℓ = log L, because multiplying tiny densities is a good way to underflow, and adding logs is not. The slope of ℓ is the score. The peak is the MLE. How sharp the peak is (the curvature) is information.",
      "If you care about one coordinate ψ and the rest is nuisance, take a slice: for each ψ, maximize over the nuisance. That slice is the profile likelihood. A Wald interval from a transformation you never profiled can look prettier than the likelihood and still be wrong near a boundary.",
    ],
    whyItMatters:
      "Allele frequencies, variance components, and mixture weights live near boundaries. Reading the likelihood curve — not just a star on a coefficient — is how you notice the model is gasping.",
    watchFor: [
      "L(θ | y) is not a density in θ. Do not integrate it and call the result a probability unless you wrote a prior.",
      "A profile is max over nuisance, not ‘plug in the full-model estimate and call it a profile.’",
      "Independence is a modeling claim. A phylogenetic likelihood is still a likelihood; the joint f(y | θ) just stopped being a product over isolates.",
    ],
    sayBackPrompt:
      "In your own words: what is a likelihood, why isn’t it a probability distribution on θ, and what is a profile likelihood for?",
    sayBackModel:
      "Likelihood is the sampling density with the observed data frozen, read as a function of the parameter. That does not make θ a random variable. A profile likelihood is the 1-D slice you get by maximizing the nuisance parameters at each value of the scientific target.",
  },
  "stats-foundations": {
    analogy: {
      title: "A family of weather maps, then one storm",
      body: "A model is a whole cabinet of weather maps, one for each setting of θ. Data is the storm that actually happened. Estimation is: which map in the cabinet makes this storm look least weird? Bias and variance are about how that guessing rule behaves if storms kept happening — they are not properties of Thursday’s number sitting on your desk.",
    },
    plain: [
      "Data y are treated as one draw from Y ~ f(y | θ). After you see y, the same formula in θ is the likelihood. The MLE is a maximizer of that function (or of its log).",
      "For regular models, the log-likelihood is roughly a hill with a quadratic top. The curvature is Fisher information. Then the MLE is approximately Normal, with a variance that shrinks as you get more independent pieces of data.",
      "An estimator is a recipe that eats data and spits out a number. Bias, variance, consistency belong to the recipe under repeated sampling — not to the single number you already computed on n = 12.",
    ],
    whyItMatters:
      "TB papers often treat a point estimate as a fact. Foundations are the reminder that the fact is a function of noisy data, and that a good MLE can still look embarrassing in a small, weakly identified problem.",
    watchFor: [
      "If the true distribution is not in your family, the MLE converges to a Kullback–Leibler projection, not ‘the truth.’ Sandwich variance is the adult response.",
      "Invariance: the MLE of g(θ) is g of the MLE. The delta method is how you get a standard error after a logit or log transform.",
      "n = 12 with a weakly identified parameter is not a personality failure of maximum likelihood. It is the sample telling you the hill is flat.",
    ],
    sayBackPrompt:
      "In your own words: what is a likelihood, what is an estimator, and why aren’t bias and variance properties of the number you already computed?",
    sayBackModel:
      "Likelihood is the sampling model with data frozen, read as a function of θ. An estimator is a function of the data. Bias and variance describe how that function behaves under the sampling distribution — they are about the recipe, not about one realized number.",
  },
  "stats-bayesian": {
    analogy: {
      title: "A hunch that has to survive the clues",
      body: "You walk in with a hunch (the prior). Each new clue slides that hunch (the likelihood). What you walk out with is the hunch after the clues (the posterior). If you refuse to write a hunch, you are not being objective — you are refusing to say what you thought before the data. A 95% credible interval is ‘I now put 95% of my belief in this range.’ A 95% confidence interval is a different animal: a statement about a procedure in a long run of hypothetical datasets.",
    },
    plain: [
      "Bayes on parameters: posterior ∝ likelihood × prior. The likelihood is the same object the MLE used. The new scientific statement is the prior — you have to defend it.",
      "With a lot of data and a prior that is not insane, posterior means and MLEs meet. With sparse DST errors, rare mutations, or a new drug, they do not. That disagreement is the point of being Bayesian, not an embarrassment.",
      "Computation is part of the result. MCMC, variational methods, Laplace — whatever you used, the diagnostics (R̂, ESS, HMC divergences) belong in the paper. A pretty density from an unconverged chain is not a posterior.",
    ],
    whyItMatters:
      "Rare resistance mutations and lab-level error rates are exactly the sparse, hierarchical setting where a prior (often itself hierarchical) is doing work. Pretending you have infinite data is the MLE’s comfort blanket.",
    watchFor: [
      "A credible interval is not a confidence interval with a friendlier name. Do not rename one as the other.",
      "A ‘flat prior on the probability scale’ can be surprisingly informative on the logit scale, and vice versa.",
      "Conjugacy (Beta–Binomial, etc.) is a convenience, not a requirement. Most lab models are not conjugate.",
    ],
    sayBackPrompt:
      "In your own words: what does Bayesian updating add to a likelihood, and how is a credible interval different from a confidence interval?",
    sayBackModel:
      "It multiplies the same likelihood by a prior you have to defend, then renormalizes to a posterior over θ. A 95% credible interval is a region with posterior probability 0.95. A 95% confidence interval is a claim about long-run coverage of a procedure, not a probability for this θ.",
  },
  "stats-ols-glm": {
    analogy: {
      title: "A stick through a cloud, then a stick that is allowed to bend",
      body: "Ordinary least squares is: draw the stick through a cloud of dots that misses as little as possible in squared vertical error. That stick is also the MLE if the noise is Gaussian and the mean really is a straight line in the parameters. A GLM keeps the idea of a linear recipe for a predictor, but lets the dots be yes/no, counts, waiting times… you send the linear predictor through a link (logit, log, …) so the mean stays in a legal range, and you let the variance follow the mean the way that family of data should.",
    },
    plain: [
      "OLS: E[Y] = Xβ, estimate β by minimizing the sum of squared residuals. If errors are iid Normal, that minimizer is the MLE.",
      "GLM: keep η = Xβ, set g(μ) = η for a link g, and let Var(Y) follow an exponential-family variance function. Logistic regression is Bernoulli + logit. Poisson regression is counts, usually with a log link and often an offset for exposure.",
      "Once you can write those two, a lot of ‘machine learning classifiers’ in TB papers are GLMs wearing a hoodie. IRLS (iteratively reweighted least squares) is the algorithm: OLS is the first and last iteration when the model is Gaussian with identity link.",
    ],
    whyItMatters:
      "Resistance as a binary, colony counts, and MIC-style continuous outcomes are different mean–variance marriages. Using OLS on a probability, or Poisson on wildly overdispersed clusters, is how papers get confident about the wrong uncertainty.",
    watchFor: [
      "Overdispersed counts: quasi-Poisson, negative binomial, or a hierarchical Poisson — not ‘the Poisson p-values looked significant.’",
      "A correct mean model with a wrong variance can still give consistent β̂ (quasi-likelihood) if you use sandwich standard errors.",
      "Identity link + bounded outcome is how fitted probabilities fall outside [0, 1]. That is the link function knocking on the door.",
    ],
    sayBackPrompt:
      "In your own words: what does OLS assume, and what does a GLM change while keeping a linear predictor?",
    sayBackModel:
      "OLS models a linear mean and minimizes squared error; under Gaussian iid errors it is the MLE. A GLM keeps η = Xβ but pushes the mean through a link and lets the variance follow an exponential-family function of the mean — logistic and Poisson are the two workhorse cases.",
  },
  "stats-hierarchical": {
    analogy: {
      title: "Class average, then each kid, then a compromise",
      body: "If you pool everyone, a class of thirty and a class of two get the same vote, and the tiny class’s weird week disappears. If you refuse to pool, the kid who took two quizzes looks like a genius or a disaster. Partial pooling is the adult move: start each kid near the class, then let their own quizzes pull them away in proportion to how much data they actually have. Small groups shrink. Large groups keep their personality. That is a hierarchical model.",
    },
    plain: [
      "TB data are nested whether you like it or not: reads in isolates, isolates in patients, patients in households, households in districts. A pooled GLM pretends the rows are iid. A no-pooling GLM fits a separate parameter in every district and overfits the small ones.",
      "A hierarchical model puts a distribution over unit-level parameters. The data update each unit and also estimate the shared mean and the spread. That spread τ is ‘how much personality do the units have?’",
      "The payoff is shrinkage: noisy units slide toward the crowd; well-measured units stay put. In a genomics lab this is how to think about drug-specific error rates, lineage effects, and lab effects on MIC.",
    ],
    whyItMatters:
      "A star on a dummy-variable coefficient for ‘Beijing lineage’ is often a poorly pooled hierarchical fact. Shrinkage is not cosmetic. It is how you stop small strata from dominating a paper.",
    watchFor: [
      "The LRT for τ = 0 is a boundary test. The null is a 50:50 mix of χ²_0 and χ²_1, not χ²_1. Software that prints a naïve p-value is anti-conservative.",
      "Marginalizing a Gaussian random intercept through a nonlinear GLM does not give another GLM. That is why people use PQL, quadrature, Laplace, or MCMC.",
      "Priors that pile up at τ = 0 can overshrink. Half-t or exponential priors on scale, plus a prior predictive check, are the adult moves.",
    ],
    sayBackPrompt:
      "In your own words: what is partial pooling, and why is testing a random-effect variance at zero a special headache?",
    sayBackModel:
      "Partial pooling lets unit-level parameters share a prior that is itself estimated from the units, so small groups shrink toward the crowd and large groups keep their estimates. Testing τ = 0 sits on the boundary of the parameter space, so Wilks’ plain χ² does not apply; the null is a mixture of chi-squares.",
  },
  "tb-rifampin": {
    analogy: {
      title: "A stick in the zipper, and a locksmith who only checks the keyhole",
      body: "RNA polymerase is a zipper that pulls RNA out of DNA. Rifampin is a stick jammed in that zipper so it cannot keep travelling. Almost all high-level resistance in M. tuberculosis is a tiny change in the zipper’s teeth — missense mutations in a short stretch of rpoB called the RRDR. Xpert is a locksmith who only inspects the keyhole (those 81 base pairs). If the hinge is broken further down the door (I491F, outside the RRDR), Xpert can still say ‘looks fine’ while the zipper is already jammed open.",
    },
    plain: [
      "Rifampin (rifampicin) is sterilizing: it helps clear persisting bacilli and is why short-course therapy exists. It binds the β subunit of RNA polymerase, encoded by rpoB, and blocks elongation.",
      "In clinical Mtb, high-level rifampin resistance is almost always a substitution in the 81-bp RRDR. The common lab mutation is Ser450Leu in Mtb codon numbering — the same residue as E. coli Ser531. Always say which numbering you are using.",
      "That is why Xpert MTB/RIF can treat five molecular beacons over the RRDR as a surrogate for rifampin resistance, and why rifampin resistance is used as a marker for MDR-TB. Excellent surrogate, not a perfect one: silent SNPs, disputed borderline mutations, and rare non-RRDR resistance exist.",
    ],
    whyItMatters:
      "If you mix Mtb and E. coli numbering, you will hunt the wrong codon. If you trust Xpert as a complete rpoB survey, you will miss I491F and argue with a correct MGIT result. Catalogue grade, probe dropout, and numbering are the three things a genomics person actually has to get right.",
    watchFor: [
      "S450L (Mtb) = S531L (E. coli). Papers, WHO catalogues, and older DST mix these. Write the system.",
      "Xpert reports probe dropout, not a called base. Heteroresistance can look like a delayed Ct or a missing probe.",
      "I491F sits outside the classical RRDR and is a known Xpert miss. Compensatory rpoC/rpoA alleles restore fitness after S450L; they are not a second RRDR and not an Xpert target.",
    ],
    sayBackPrompt:
      "In your own words: how does rifampin work, where does high-level resistance live, and why can Xpert disagree with phenotype?",
    sayBackModel:
      "Rifampin binds the β subunit of RNA polymerase (rpoB) and blocks elongation. High-level resistance is almost always a missense in the 81-bp RRDR, commonly S450L in Mtb numbering. Xpert only interrogates that strip, so mutations outside it (e.g. I491F), disputed alleles, or mixed populations can make NAAT and MGIT disagree without anyone in the lab being ‘wrong.’",
  },
  "tb-granuloma": {
    analogy: {
      title: "A walled city with a dead, airless dump in the middle",
      body: "A granuloma is not a solid ball of ‘sleeping TB.’ It is a walled city: macrophages in the streets, lymphocytes on the walls, and often a caseous dump in the center with no air, odd pH, and a lot of host lipid. Drugs that look heroic on replicating broth cultures can look ordinary in that dump. A cavity is the city emptying into an airway — high smear, high mutation supply, high transmission. HIV and anti-TNF dissolve the walls toward a messy, multibacillary sprawl.",
    },
    plain: [
      "The tuberculous granuloma is spatially organised: infected and uninfected macrophages (epithelioid, foamy), a cuff of T cells, sometimes B-cell follicles, fibroblasts, and often a necrotic caseous core. It is a living tissue programme, not a binary prison.",
      "Caseum is hypoxic, acidic, and full of host lipids. Bacilli there are slowly replicating or non-replicating, with altered drug susceptibility. That is a pharmacology story for pyrazinamide and rifamycins, and a humility story for isoniazid.",
      "Cavitation is a granuloma that has emptied into an airway. Different lesions in one lung can host different resistance minorities — a single sputum WGS is a sample of what drained today.",
    ],
    whyItMatters:
      "Fitting a four-month human regimen to a non-necrotic mouse CFU curve is a category error. Lesion architecture is why ‘cidal in broth’ is not ‘sterilizing in a person,’ and why spatial DST is a real object.",
    watchFor: [
      "C3HeB/FeJ mice, rabbits, and macaques caseate; many C57BL/6 models do not. Know which animal you are quoting.",
      "Rifampin penetration into caseum is limited relative to the vascularized cuff. Sterilizing ≠ cidal.",
      "Calcified Ghon complexes are old negotiation on a radiograph, not proof of sterility.",
    ],
    sayBackPrompt:
      "In your own words: what is a granuloma, what is caseum doing to the bacilli and the drugs, and what is a cavity?",
    sayBackModel:
      "A granuloma is a structured lesion (macrophage core, lymphocytic cuff, often necrosis), not a solid latency ball. Caseum is hypoxic, acidic, lipid-rich, and shifts bacilli toward slow or non-replication with different drug susceptibility. A cavity is that lesion emptying into an airway, which raises smear, mutation supply, and transmission.",
  },
  "tb-wgs-dst": {
    analogy: {
      title: "A graded cheat-sheet, a caller, and a leftover argument with the Petri dish",
      body: "Computational DST is not a crystal ball. It is a graded cheat-sheet of mutations (the catalogue), a piece of software that decides what it saw in the BAM (the caller), and a leftover disagreement with phenotype (the residual). The residual is the interesting statistical object. The tool is not the catalogue. Unseen mechanisms are assumed rare — that is a prior, whether or not anyone wrote the word ‘prior.’",
    },
    plain: [
      "WGS of MTBC can predict many first- and second-line phenotypes faster than waiting for second-line MGIT, and you get lineage, mixed infection, and relatedness from the same BAM.",
      "WHO’s mutation catalogue grades variants: associated with resistance, not associated, interim, uncertain. TBProfiler, Mykrobe, and homemade Snippy pipelines differ in what they call, what they filter, and whether they report allele fraction.",
      "Where catalogues are strong (RIF, INH, FQ, AMK), concordance is high enough for clinical use in many programmes. Where they are weaker, humility is the method. PZA is actually pretty good if you sequence all of pncA; EMB and BDQ still need more.",
    ],
    whyItMatters:
      "A genomics lab that treats a caller’s ‘R’ as a phenotype has skipped the residual. Mixed infection, catalogue holes, and lab phenotype noise are why gDST is a statistical claim with a microbiology remainder.",
    watchFor: [
      "The tool is not the catalogue. Changing software can change a call without the biology moving.",
      "Allele fraction matters for heteroresistance. A 5% minority can be clinically real and software-optional.",
      "Unseen mechanisms are a prior. New drugs and new efflux stories will keep violating it.",
    ],
    sayBackPrompt:
      "In your own words: what three pieces make ‘WGS as DST,’ and why isn’t a caller output a phenotype?",
    sayBackModel:
      "A graded mutation catalogue, a variant caller / pipeline, and a leftover disagreement with phenotypic DST. The caller is a bioinformatic decision about a BAM; phenotype is a growth experiment. Concordance is high for some drugs and not others, and mixed infection plus catalogue holes are why the residual is part of the result.",
  },
};
