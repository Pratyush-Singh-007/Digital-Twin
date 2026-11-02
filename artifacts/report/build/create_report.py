from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.style import WD_STYLE_TYPE
from pathlib import Path

OUT=Path('/Users/C5419701/Desktop/Digital-Twin/artifacts/report/output/Agricultural_Digital_Twin_Research_and_Prototype_Report.docx')
doc=Document()
sec=doc.sections[0]
sec.page_width=Inches(8.27); sec.page_height=Inches(11.69)
sec.top_margin=Inches(.72); sec.bottom_margin=Inches(.72); sec.left_margin=Inches(.82); sec.right_margin=Inches(.82)
INK='202B28'; GREEN='365E4B'; MUTED='59645F'; PALE='EAF0EC'; LIGHT='F3F6F4'; WHITE='FFFFFF'; BORDER='CBD5CE'

def font(run,name='Aptos',size=10.5,bold=None,color=INK,italic=None):
    run.font.name=name; run._element.get_or_add_rPr().rFonts.set(qn('w:ascii'),name); run._element.get_or_add_rPr().rFonts.set(qn('w:hAnsi'),name)
    run.font.size=Pt(size); run.font.color.rgb=RGBColor.from_string(color)
    if bold is not None: run.bold=bold
    if italic is not None: run.italic=italic

def set_cell_shading(cell,fill):
    tcPr=cell._tc.get_or_add_tcPr(); shd=OxmlElement('w:shd'); shd.set(qn('w:fill'),fill); tcPr.append(shd)
def set_cell_margins(cell,top=80,start=100,bottom=80,end=100):
    tc=cell._tc; tcPr=tc.get_or_add_tcPr(); m=OxmlElement('w:tcMar')
    for tag,val in [('top',top),('start',start),('bottom',bottom),('end',end)]:
        node=OxmlElement('w:'+tag); node.set(qn('w:w'),str(val)); node.set(qn('w:type'),'dxa'); m.append(node)
    tcPr.append(m)
def set_repeat_table_header(row):
    trPr=row._tr.get_or_add_trPr(); el=OxmlElement('w:tblHeader'); el.set(qn('w:val'),'true'); trPr.append(el)
def add_page_field(p):
    r=p.add_run(); fld=OxmlElement('w:fldSimple'); fld.set(qn('w:instr'),'PAGE'); r._r.addnext(fld)
def add_hyperlink(p,text,url):
    part=p.part; rid=part.relate_to(url,'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',is_external=True)
    h=OxmlElement('w:hyperlink'); h.set(qn('r:id'),rid); r=OxmlElement('w:r'); pr=OxmlElement('w:rPr')
    c=OxmlElement('w:color'); c.set(qn('w:val'),GREEN); pr.append(c); u=OxmlElement('w:u'); u.set(qn('w:val'),'single'); pr.append(u); r.append(pr)
    t=OxmlElement('w:t'); t.text=text; r.append(t); h.append(r); p._p.append(h)

def para(text='',style=None,after=5,before=0,align=None,keep=False):
    p=doc.add_paragraph(style=style); p.paragraph_format.space_after=Pt(after); p.paragraph_format.space_before=Pt(before)
    if align is not None: p.alignment=align
    if text:
        rr=p.add_run(text); font(rr)
    if keep: p.paragraph_format.keep_with_next=True
    return p
def rich_para(parts,after=5,before=0,align=None):
    p=doc.add_paragraph(); p.paragraph_format.space_after=Pt(after); p.paragraph_format.space_before=Pt(before)
    if align is not None: p.alignment=align
    for t,opts in parts:
        r=p.add_run(t); font(r,bold=opts.get('bold'),italic=opts.get('italic'),color=opts.get('color',INK),size=opts.get('size',10.5))
    return p
def heading(text,level=1):
    p=doc.add_paragraph(style=f'Heading {level}'); p.paragraph_format.keep_with_next=True
    p.paragraph_format.space_before=Pt(14 if level==1 else 9); p.paragraph_format.space_after=Pt(5)
    r=p.add_run(text); font(r,size=16 if level==1 else 12.5,bold=True,color=GREEN if level==1 else INK)
    return p
def bullet(text,level=0):
    p=doc.add_paragraph(style='List Bullet' if level==0 else 'List Bullet 2'); p.paragraph_format.space_after=Pt(3); r=p.add_run(text); font(r,size=10.2,color=INK); return p
def table(headers,rows,widths=None,font_size=8.6):
    t=doc.add_table(rows=1,cols=len(headers)); t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.autofit=False
    try: t.style='Table Grid'
    except: pass
    hdr=t.rows[0]; set_repeat_table_header(hdr)
    for j,h in enumerate(headers):
        c=hdr.cells[j]; c.text=''; set_cell_shading(c,GREEN); set_cell_margins(c); c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p=c.paragraphs[0]; p.paragraph_format.space_after=Pt(0); r=p.add_run(h); font(r,size=font_size,bold=True,color=WHITE)
    for i,row in enumerate(rows):
        cells=t.add_row().cells
        trPr=t.rows[-1]._tr.get_or_add_trPr(); trPr.append(OxmlElement('w:cantSplit'))
        for j,val in enumerate(row):
            c=cells[j]; c.text=''; set_cell_margins(c); c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            if i%2==1: set_cell_shading(c,LIGHT)
            p=c.paragraphs[0]; p.paragraph_format.space_after=Pt(0); p.paragraph_format.line_spacing=1.0
            r=p.add_run(str(val)); font(r,size=font_size,color=INK,bold=(j==0))
    if widths:
        for row in t.rows:
            for j,w in enumerate(widths): row.cells[j].width=Inches(w)
    para('',after=2)
    return t
def callout(title,body):
    t=doc.add_table(rows=1,cols=1); t.alignment=WD_TABLE_ALIGNMENT.CENTER; c=t.cell(0,0); set_cell_shading(c,PALE); set_cell_margins(c,130,160,130,160)
    p=c.paragraphs[0]; p.paragraph_format.space_after=Pt(2); r=p.add_run(title+'  '); font(r,size=10.4,bold=True,color=GREEN); r=p.add_run(body); font(r,size=10.2,color=INK)
    para('',after=3)

def ref_item(n,body,url=None):
    p=doc.add_paragraph(); p.paragraph_format.left_indent=Inches(.24); p.paragraph_format.first_line_indent=Inches(-.24); p.paragraph_format.space_after=Pt(4)
    r=p.add_run(f'[{n}] {body} '); font(r,size=9.2,color=INK)
    if url: add_hyperlink(p,url,url)

# Styles
styles=doc.styles
normal=styles['Normal']; normal.font.name='Aptos'; normal._element.rPr.rFonts.set(qn('w:ascii'),'Aptos'); normal._element.rPr.rFonts.set(qn('w:hAnsi'),'Aptos'); normal.font.size=Pt(10.5); normal.font.color.rgb=RGBColor.from_string(INK)
normal.paragraph_format.line_spacing=1.12; normal.paragraph_format.space_after=Pt(5)
for sty in ['Heading 1','Heading 2','Heading 3']:
    styles[sty].font.name='Aptos Display'; styles[sty]._element.rPr.rFonts.set(qn('w:ascii'),'Aptos Display'); styles[sty]._element.rPr.rFonts.set(qn('w:hAnsi'),'Aptos Display')
# Footer
fp=sec.footer.paragraphs[0]; fp.alignment=WD_ALIGN_PARAGRAPH.RIGHT; fp.paragraph_format.space_before=Pt(0); fp.paragraph_format.space_after=Pt(0)
r=fp.add_run('AGRICULTURAL DIGITAL TWIN REPORT  |  '); font(r,size=8,color=MUTED,bold=True); add_page_field(fp)

# Cover
p=doc.add_paragraph(); p.paragraph_format.space_before=Pt(78); p.paragraph_format.space_after=Pt(14)
r=p.add_run('AGRICULTURAL DIGITAL TWINS'); font(r,size=12,bold=True,color=GREEN)
p=doc.add_paragraph(); p.paragraph_format.space_after=Pt(14); p.paragraph_format.keep_with_next=True
r=p.add_run('Research and Prototype Report'); font(r,name='Aptos Display',size=31,bold=True,color=INK)
p=doc.add_paragraph(); p.paragraph_format.space_after=Pt(30)
r=p.add_run('Uncertainty-aware irrigation decisions from soil and sensor data'); font(r,size=16,color=MUTED)
# restrained cover accent block
cover=doc.add_table(rows=1,cols=1); c=cover.cell(0,0); set_cell_shading(c,GREEN); set_cell_margins(c,180,200,180,200)
p=c.paragraphs[0]; p.paragraph_format.space_after=Pt(2); r=p.add_run('AUTHORS'); font(r,size=9,bold=True,color='DDE8E0')
for name,ident in [('Shishir Modi','2427010089'),('Pratyush Singh','2427010023'),('Nishanth Malladi','2427010087')]:
    p=c.add_paragraph(); p.paragraph_format.space_after=Pt(1); r=p.add_run(f'{name}  |  {ident}'); font(r,size=12,bold=True,color=WHITE)
p=doc.add_paragraph(); p.paragraph_format.space_before=Pt(36); p.paragraph_format.space_after=Pt(5)
r=p.add_run('Prepared 2 November 2026'); font(r,size=10,color=MUTED)
p=doc.add_paragraph(); p.paragraph_format.space_after=Pt(0)
r=p.add_run('This report reviews two empirical studies and one review article, then maps their findings to the AgriTwin research prototype.'); font(r,size=10.5,color=INK)
doc.add_page_break()

heading('Executive Summary',1)
para('Agricultural irrigation depends on estimates of soil water state, but low-cost probes can lose packets, drift or produce readings outside the conditions used to train a model. A point forecast can conceal those faults. The supplied AgriTwin prototype responds by pairing a soil-moisture estimate with an uncertainty interval and deterministic safety rules. It locks simulated irrigation when uncertainty is too high, holds when moisture is adequate and suspends irrigation when a late-blight weather proxy is elevated.')
para('The literature supports three parts of this direction. Kakhani et al. show that conformal calibration can improve the empirical coverage of soil-organic-carbon prediction intervals when paired with a quantile random forest [1]. Wang et al. compare 13 machine-learning and deep-learning models for soil-moisture forecasting and find that the best architecture depends on depth and lead time [2]. Bautista et al. synthesize data, algorithms and twin architectures for smart irrigation, while emphasizing persistent challenges in data reliability, connectivity, interoperability and field adoption [3].')
para('The main contribution of the current prototype is an integrated decision concept: forecast, communicate uncertainty, assess pathogen risk and apply an auditable action gate. Its current implementation is a browser demonstration using a ridge-regression surrogate and Open-Meteo or synthetic data. The project documentation explicitly states that it has not been validated against field outcomes. The evaluation plan should therefore treat simulated water use and failure counts as test-harness outputs, not evidence of farm benefit.')
callout('Primary recommendation','Treat AgriTwin as a research prototype. First validate the moisture model and interval coverage with real, site-specific observations; then test safety rules under supervised field conditions before automating valves.')
heading('Report Structure',2)
for x in ['1. Problem and scope','2. Research evidence','3. Field landscape','4. AgriTwin design and implementation status','5. Evaluation framework and metric definitions','6. Research-gap mapping and future work','7. Conclusion and references']:
    bullet(x)

doc.add_page_break()
heading('1. Problem and Scope',1)
para('A digital twin for irrigation should keep an updated representation of the field, estimate how the soil and crop are changing, and support decisions under weather and sensor uncertainty. In a typical sensor-failure scenario, a saturated field may look dry because of a probe or transmission fault. A conventional model can then recommend unnecessary irrigation. Conversely, a missing or biased reading may conceal a real deficit. These errors can waste water and pumping energy, stress crops, or create conditions that increase disease risk.')
para('The report evaluates the supplied project as a decision-support prototype rather than as a deployed irrigation controller. It draws on the two empirical papers, the smart-irrigation review, the project ZIP documentation and the initial project slide deck. The distinction between the initial plan and the current prototype is important because they describe different data sources and model choices.')
heading('2. Research Evidence',1)
heading('2.1 Uncertainty quantification for soil organic carbon',2)
para('Kakhani et al. test whether conformal prediction can provide useful uncertainty intervals for machine-learning estimates of soil organic carbon (SOC) [1]. Their target is a spatial soil property, not a short-horizon irrigation decision. The study uses 2015 LUCAS Topsoil observations from European Union countries, with samples representing the 0–20 cm layer. The data are highly variable: SOC values range from 0.1 to 560.2 g/kg.')
para('The authors combine soil samples with 28 environmental predictors: climate summaries, Landsat-8 bands and spectral indices, and terrain attributes. They compare five approaches: bootstrap random forest (BRF), conformalized quantile random forest (CQRF), quantile neural networks (QNN), quantile gradient boosting (QGB) and quantile linear regression (QLR). A 10% target miscoverage rate is used for conformal calibration. Test sets are generated with five seeds; validation is used for model selection and interval calibration.')
para('The main finding is a coverage–sharpness trade-off. CQRF achieves mean prediction-interval coverage probability (PICP) of 90%, matching the nominal target. QGB and QNN reach 89%. BRF reaches 25%, while QLR reaches 2%. Among methods with strong coverage, CQRF has the smallest reported normalized interval width. BRF has the lowest mean absolute error (MAE) and root mean square error (RMSE), but its narrow intervals miss most test values. CQRF remains comparatively accurate while providing much stronger coverage.')
table(['Method','PICP (%)','PINAW','MAE (g/kg)','RMSE (g/kg)'],[
['CQRF','90','111.91','42.20','80.79'],['QGB','89','124.30','48.15','82.39'],['QNN','89','165.58','72.05','111.73'],['BRF','25','15.67','26.07','69.03'],['QLR','2','2.24','41.15','86.59']],widths=[1.35,.9,1.0,1.2,1.25],font_size=8.7)
para('Interpretation: lower MAE or RMSE alone does not establish trustworthy uncertainty. BRF looks stronger on point-error metrics than CQRF, but its intervals are poorly calibrated by empirical coverage. For an operational twin, the interval must be judged by both its coverage and its width.',after=5)
callout('Gap this project targets','The study applies uncertainty estimation to spatial SOC mapping. It does not address hourly soil-moisture forecasting, faulty sensor telemetry, crop-disease conflicts or actuator decisions. AgriTwin targets that transfer: make uncertainty visible and use it to gate irrigation. This is an intended extension, not a result demonstrated by the SOC study or validated by the prototype.')
heading('2.2 Deep-learning models for soil-moisture prediction',2)
para('Wang et al. compare machine-learning and deep-learning methods for soil-moisture prediction across sites, soil textures, forecast horizons and depths [2]. The authors use time series from 30 sites in the International Soil Moisture Network (ISMN), with measurements at five depths from 0.05 m to 1.00 m. Inputs include precipitation, air temperature, longwave and shortwave radiation, wind speed, relative humidity, soil temperature and previous soil-moisture values.')
para('The comparison includes three machine-learning baselines (random forest, extreme learning machine and support-vector regression) and ten deep-learning structures, including CNN, LSTM, Transformer, hybrid CNN–LSTM variants, feature- and temporal-attention LSTMs, and GAN-LSTM. A four-day input history is used for one-, three- and seven-day forecasts. Data are split in time order into training, validation and test partitions at a 6:2:2 ratio, and the neural-network training process is repeated 25 times. Model behavior is explored through SHAP feature analysis and t-SNE visualizations.')
para('LSTM is reported as a strong temporal baseline. Feature-attention LSTM (FA-LSTM) ranks ahead of the other attention variants in most cases. At 0.20 m depth, FA-LSTM has R² values of 0.965, 0.925 and 0.849 for one-, three- and seven-day forecasts, respectively, in the reported ten-site table. GAN-LSTM outperforms standard LSTM in most tested settings, especially for three- to seven-day predictions, while the reported computational costs are similar. Performance changes with depth, site and lead time; temporal attention alone is not consistently helpful.')
para('These results show why model selection should reflect the deployment horizon and depth. They do not show that the most accurate model will necessarily produce safe irrigation actions. The paper compares predictive skill and interpretation; it does not evaluate conformal coverage under sensor faults, a pathogen-aware action policy or water use from a closed-loop controller.')
callout('Gap this project targets','AgriTwin adds an uncertainty band and explicit lock, hold and suspend states to a forecast-driven irrigation workflow. The current browser prototype does not implement the paper’s FA-LSTM or GAN-LSTM models; it uses a ridge surrogate. The prototype therefore demonstrates the decision architecture, not the superior predictive performance of the research models.')
heading('2.3 Review of ML and digital twins in smart irrigation',2)
para('Bautista, Gallegos and Lampayan provide a structured review of machine learning and digital twins in smart irrigation [3]. Their search covers literature published from 2019 to 2024, drawing from Scopus, ScienceDirect, IEEE Xplore and Google Scholar. They report 246 records initially retrieved and 96 studies retained after screening. The review organizes the evidence around five input domains: soil, weather and climate, crop characteristics, remote sensing / GIS, and IoT telemetry.')
para('The review describes a layered irrigation architecture that moves from physical sensors and data management through ML modeling and simulation to decision-making and actuation. It discusses supervised learning, deep learning, reinforcement learning and data-fusion methods. The authors identify common barriers: missing or drifting sensor data, temporal and spatial mismatches, weak connectivity, limited interoperability, site-specific retraining, black-box models and cost constraints in smallholder settings. They recommend modular and lightweight designs, edge analytics, hybrid physics–ML models, privacy-preserving learning and farmer-centered evaluation.')
para('Unlike the first two papers, this article is a literature synthesis rather than a new controlled experiment. It offers a useful architecture and adoption context but does not establish one model’s predictive accuracy or a quantified water-saving effect for AgriTwin.')

doc.add_page_break()
heading('3. Field Landscape',1)
para('Selected projects illustrate different scales of agricultural digital twins. Their descriptions are useful comparators, but project aims and planned evaluations should not be confused with published field results.')
table(['Project','Focus and data','Evidence posture'],[
['CropTwin (University of Nebraska–Lincoln)','Low-cost IoT sensing and deep models to infer crop and environmental variables; proposes day-to-day updates and smart-irrigation research.','Project description says it would deploy and evaluate the twin through a soybean growth season. The listed funding period ended in August 2026; the page does not provide a completed-results report [4].'],
['AI4WATER (UPC, Spain)','Irrigation-sector twin for water use, combining soil-moisture probes, weather stations, Earth-observation data and ground-penetrating radar [5].','Project ran from 2022 to 2024. The public project description explains the implementation setting and design; reported aims should not be read as measured water savings.'],
['DigiTom (Netherlands)','Greenhouse tomato twin combining a crop-growth model, plant logistics and camera-based crop-status data [6].','The project page describes validation against historical and current TOM4.0 crops and lists the project as 2025–2026.']
],widths=[1.35,2.55,2.65],font_size=8.3)
para('Across these examples, a common direction is to connect sensor data with an evolving model and a decision workflow. AgriTwin’s specific angle is uncertainty-aware safety gating under simulated telemetry faults. Its next step is stronger grounding in measured field data and an evaluation strategy that compares recommendations with real management practice.')

heading('4. AgriTwin Design and Implementation Status',1)
heading('4.1 Intended project architecture',2)
para('The supplied project deck describes an intended multi-objective twin for soil-moisture prediction, pathogen risk and irrigation decisions. It proposes ERA5-Land as a broad training target, ISMN IIT Kanpur for an in-situ check, and Open-Meteo for weather inputs. It names LSTM, BiLSTM or XGBoost as candidate predictors and proposes MC-dropout or conformal intervals. Three decision rules form the safety layer: allow irrigation only when the soil is dry and uncertainty is below a bound; suspend irrigation when a disease-risk score is high; and lock the actuator when uncertainty is excessive [7].')
heading('4.2 What the supplied prototype currently implements',2)
para('The ZIP documentation describes a more lightweight browser prototype. The moisture surrogate is ridge regression over 16 lag and rolling features. Inputs are hourly Open-Meteo telemetry or a synthetic season. A chronological train/calibration/evaluation split produces a nominal 90% residual interval. At prediction time, the interval is widened using a dropout multiplier of 1 + 4.5δ, where δ is the fraction of missing readings. That widening is a heuristic; serial dependence and heat or drought shifts can violate calibration assumptions. The project documentation therefore cautions that nominal split-conformal coverage is not guaranteed under those conditions [8].')
para('The prototype also calculates a late-blight weather proxy. Its index weights temperature suitability at 0.30, sustained humidity at 0.35 and leaf wetness at 0.35. Temperature suitability is based on the share of the previous 24 hours in a 10–25 °C window; the humidity component reflects consecutive hours above 85% RH relative to a six-hour window; and leaf wetness is approximated from rain or a dew-point depression below 2 °C. A risk score above 0.70 suspends irrigation. These thresholds and components are prototype heuristics, not independently validated agronomic standards.')
para('The action policy evaluates uncertainty first. If interval width reaches the safety bound, the state becomes LOCKED and requests human review. If uncertainty is acceptable, adequate moisture leads to HOLD. A dry condition proceeds to the pathogen check: elevated risk leads to SUSPENDED, while low risk permits the simulated IRRIGATE state. The interface exposes these states and the rule path for inspection.')
table(['Capability','Initial project plan','Prototype documented in ZIP'],[
['Data','ERA5-Land targets, ISMN IIT Kanpur ground truth, Open-Meteo weather inputs.','Open-Meteo or synthetic telemetry. ERA5-Land is listed as a candidate source but is not ingested; an ISMN CSV control counts rows and does not parse values for comparison [8].'],
['Forecast model','LSTM / BiLSTM / XGBoost candidates.','In-browser ridge-regression surrogate with 16 lag and rolling features.'],
['Uncertainty','MC-dropout or conformal prediction.','Split-conformal residual interval plus heuristic widening under simulated dropout; not a distribution-free guarantee under shift.'],
['Control','Safety brake, moisture threshold and pathogen-conflict rules.','Implemented deterministic states for simulated recommendations; not connected to field actuators.']
],widths=[1.05,2.5,3.0],font_size=8.2)
callout('Status','The project deck describes the broader intended system. The ZIP describes the implemented demo. This report treats live-looking dashboard values and seasonal simulator outputs as illustrative or synthetic unless separately validated with field measurements.')

heading('5. Evaluation Framework and Metric Definitions',1)
para('The prototype documentation proposes three complementary experiments. First, measure forecast quality on a clean held-out partition. Second, inject packet dropout from 0% to 40% and heat / drought shocks, then compare measured interval coverage and width. Third, replay the same 90-day simulated season and telemetry corruption for a confidence-blind point-forecast policy and the uncertainty-gated policy. The simulator tracks blight-conflict irrigation, overwatering after false-dry signals, under-watering during true deficits, human escalations and water use. These tests can expose code and policy failures, but they cannot prove water savings, yield benefits or safe operation in a farm.')
table(['Metric','Definition','How to read it'],[
['MAE — mean absolute error','Average absolute difference between each prediction and observed value.','Lower is better; the unit is the target variable’s unit.'],
['RMSE — root mean square error','Square root of the average squared prediction error.','Lower is better; larger misses count more heavily than in MAE.'],
['R² — coefficient of determination','Compares residual error with variation around the observed mean.','1 is perfect; 0 is equivalent to predicting the mean; negative means worse than that baseline.'],
['PICP — prediction interval coverage probability','Share or percentage of observed values contained in the predicted interval.','Compare measured PICP with the nominal target (for example, 90%); coverage alone does not say whether intervals are useful.'],
['MPIW — mean prediction interval width','Average upper-minus-lower width of the prediction intervals.','Narrower intervals are sharper only when coverage remains adequate.'],
['PINAW — normalized average interval width','Average interval width divided by the observed target range, as used in the SOC study.','Lower is narrower on a normalized scale; compare it alongside PICP.']
],widths=[1.55,2.9,2.15],font_size=8.3)
para('For the SOC study, MAE and RMSE are reported in g/kg. For the soil-moisture study, RMSE uses the soil-moisture data units. In the AgriTwin evaluation, the units should be recorded with each dataset and remain consistent across sites and depths. Report the sample count, nominal interval level, empirical PICP, MPIW and failure-class denominator for every scenario.')
heading('5.1 Recommended evaluation safeguards',2)
for x in [
'Keep an untouched chronological test period; do not tune thresholds or uncertainty bounds on evaluation outcomes.',
'Report results separately by site, soil depth, crop stage and fault severity. Average scores can hide weak local performance.',
'Compare the ridge prototype with persistence, random forest and an LSTM or attention model when data and compute permit.',
'Calibrate intervals on real residuals and evaluate empirical PICP under clean, dropout, drift and heat / drought-shift conditions.',
'Use ablations to isolate the effect of the uncertainty gate, pathogen gate and dropout widening heuristic.',
'Keep agronomists and growers in the loop; record recommendation acceptance, overrides and operational burden alongside water and crop outcomes.'
]: bullet(x)

heading('6. Research-Gap Mapping and Future Work',1)
table(['Evidence gap','AgriTwin response','Work still required'],[
['SOC uncertainty work quantifies uncertainty for spatial SOC maps, not dynamic irrigation state or actuator decisions.','Transfer the uncertainty-aware principle to moisture forecasting and a safety gate.','Evaluate on field soil-moisture data; verify interval coverage under dependent time-series residuals and distribution shifts.'],
['Soil-moisture model comparisons focus on predictive skill across models, depths and horizons, not safe closed-loop irrigation or sensor-fault response.','Add dropout simulation, uncertainty display, pathogen conflict logic and auditable lock / hold / suspend / irrigate states.','Test whether those additions reduce decision errors without excessive lockouts, missed irrigation or avoidable water use.'],
['Smart-irrigation deployments face data, network, interoperability, cost and adoption barriers.','Use a modular browser prototype and explicit human-review state.','Integrate measured sources, resolve provenance and synchronization, co-design with growers, and test low-connectivity operation.']
],widths=[2.35,2.15,2.15],font_size=8.1)
heading('6.1 Roadmap',2)
for h,b in [
('1. Validate data provenance','Parse real ISMN observations and compare them with model outputs; document location, sensor depth, units, missingness and synchronization. Establish a measured baseline before using ERA5-Land or weather API products as targets.'),
('2. Establish model and interval performance','Evaluate candidate predictors against persistence and tree-based baselines. Calibrate intervals by site and depth, then test coverage under dropout, drift and out-of-range weather. Report MAE, RMSE, R², PICP and MPIW together.'),
('3. Validate agronomic rules','Review crop-specific dry thresholds and the late-blight proxy with agronomists. Compare risk flags against observed disease or validated warning systems; do not treat the 0.70 cutoff as universal.'),
('4. Run a supervised field pilot','Present recommendations without automatic actuation. Log predicted state, interval, input health, rule outcome, farmer action, water, energy and crop response. Define stop criteria and manual override before any valve integration.'),
('5. Test deployment and adoption','Assess connectivity, device power, interoperability, privacy, interpretability and grower workflow. Consider edge inference only after measured performance and safety requirements are met.')
]:
    rich_para([(h+': ',{'bold':True,'color':GREEN}),(b,{})],after=5)

heading('7. Conclusion',1)
para('The reviewed evidence supports a cautious design direction for agricultural digital twins. Conformal prediction can improve empirical interval coverage for soil-carbon estimation; deep-learning architectures can forecast soil moisture with skill that varies by horizon and depth; and digital-twin reviews emphasize the need to connect data, prediction, simulation and action. AgriTwin combines these ideas in a prototype that makes uncertainty part of the simulated decision path.')
para('The current implementation has not demonstrated field accuracy, calibrated coverage under sensor faults, water savings or crop benefit. Its strongest contribution today is a testable safety workflow: when input confidence is insufficient, automation should stop and request review. The next research milestone is not autonomous operation; it is reliable, site-specific evidence from measured data and a supervised pilot.')

heading('References',1)
ref_item(1,'Kakhani, N., Alamdar, S., Kebonye, N. M., Amani, M., & Scholten, T. (2024). Uncertainty Quantification of Soil Organic Carbon Estimation from Remote Sensing Data with Conformal Prediction. Remote Sensing, 16(3), 438. DOI: 10.3390/rs16030438.','https://doi.org/10.3390/rs16030438')
ref_item(2,'Wang, Y., Shi, L., Hu, Y., Hu, X., Song, W., & Wang, L. (2024). A comprehensive study of deep learning for soil moisture prediction. Hydrology and Earth System Sciences, 28, 917–943. DOI: 10.5194/hess-28-917-2024.','https://doi.org/10.5194/hess-28-917-2024')
ref_item(3,'Bautista, C. J. C., Gallegos, R. K. B., & Lampayan, R. M. (2026 issue; published online 12 November 2025). Machine learning and digital twins in smart irrigation: optimising water use through agricultural data analytics. Digital Twin, 3(1), Article 2562418. DOI: 10.1080/27525783.2025.2562418.','https://doi.org/10.1080/27525783.2025.2562418')
ref_item(4,'University of Nebraska–Lincoln, Intelligent Network System Lab. CropTwin: Automatic Digital Twin for Crop Growth Modeling towards Smart Irrigation Management. Project page; funding dates listed as 1 September 2024–31 August 2026.','https://int-lab.unl.edu/croptwin/')
ref_item(5,'Universitat Politècnica de Catalunya (UPC). AI4WATER: Digital twins for irrigated agriculture. Project page; project dates listed as 1 December 2022–30 November 2024.','https://agrotech.upc.edu/en/projects-events/ai4water/view')
ref_item(6,'EU CAP Network. DigiTom: digital twin of the TOM4.0 tomato cultivation system. Project page lists 2025–2026.','https://eu-cap-network.ec.europa.eu/projects/practice-abstracts/digitom_en')
ref_item(7,'Agricultural Digital Twin Project. User-supplied PowerPoint presentation. Initial project plan for data sources, candidate ML models and safety rules.')
ref_item(8,'AgriTwin project documentation. User-supplied Digital-Twin.zip, including README.md, DESIGN.md, source code and prototype screenshots. Accessed 2 November 2026.')

# document metadata
props=doc.core_properties; props.title='Agricultural Digital Twin Research and Prototype Report'; props.subject='Uncertainty-aware irrigation decisions from soil and sensor data'; props.author='Shishir Modi; Pratyush Singh; Nishanth Malladi'; props.keywords='agriculture, digital twin, irrigation, uncertainty, soil moisture'
OUT.parent.mkdir(parents=True,exist_ok=True); doc.save(OUT); print(OUT)
