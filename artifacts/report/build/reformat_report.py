from docx import Document
from docx.text.paragraph import Paragraph
from docx.table import Table
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from pathlib import Path
import re, shutil, zipfile, os

ROOT=Path('/Users/C5419701/Desktop/Digital-Twin')
TEMPLATE=Path('/Users/C5419701/Library/Mobile Documents/com~apple~CloudDocs/Project Based Learning (PBL)/Work Reports/PBL-1 Final Report - Shishir Modi, Pratyush Singh, Devraj Banerji.docx')
SOURCE=Path('/private/tmp/agritwin-template-20261102/source-report.docx')
OUT=ROOT/'artifacts/report/output/Agricultural_Digital_Twin_Research_and_Prototype_Report.docx'
WORK=Path('/private/tmp/agritwin-template-20261102')

src=Document(str(SOURCE))
doc=Document(str(TEMPLATE))
body=doc._element.body
sectPr=body.sectPr
for child in list(body):
    if child is not sectPr: body.remove(child)
# Keep the reference page system, while making the text area match its chapter pages.
section=doc.sections[0]
section.page_width=Inches(8.26); section.page_height=Inches(11.69)
section.left_margin=Inches(.59); section.right_margin=Inches(.39)
section.top_margin=Inches(.64); section.bottom_margin=Inches(.25)
section.header_distance=Inches(.2); section.footer_distance=Inches(.15)

normal=doc.styles['Normal']
normal.font.name='Times New Roman'; normal.font.size=Pt(10.5); normal.font.color.rgb=RGBColor(0,0,0)
normal._element.rPr.rFonts.set(qn('w:ascii'),'Times New Roman'); normal._element.rPr.rFonts.set(qn('w:hAnsi'),'Times New Roman')
normal.paragraph_format.line_spacing=1.14; normal.paragraph_format.space_after=Pt(6)

# Font and paragraph helpers.
def set_run(run,size=10.5,bold=False,italic=False):
    run.font.name='Times New Roman'; run.font.size=Pt(size); run.font.bold=bold; run.font.italic=italic; run.font.color.rgb=RGBColor(0,0,0)
    run._element.get_or_add_rPr().rFonts.set(qn('w:ascii'),'Times New Roman')
    run._element.get_or_add_rPr().rFonts.set(qn('w:hAnsi'),'Times New Roman')

def para(text='',align=WD_ALIGN_PARAGRAPH.JUSTIFY,before=0,after=6,size=10.5,bold=False,italic=False,indent=.25,keep=False):
    p=doc.add_paragraph(); p.alignment=align
    pf=p.paragraph_format; pf.space_before=Pt(before); pf.space_after=Pt(after); pf.line_spacing=1.14; pf.keep_together=True
    if indent: pf.first_line_indent=Inches(indent)
    if keep: pf.keep_with_next=True
    r=p.add_run(text); set_run(r,size,bold,italic)
    return p

def pagebreak():
    p=doc.add_paragraph(); p.paragraph_format.space_after=Pt(0); p.add_run().add_break(WD_BREAK.PAGE)

def chapter(text):
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before=Pt(4); p.paragraph_format.space_after=Pt(18); p.paragraph_format.keep_with_next=True
    r=p.add_run(text.upper()); set_run(r,12,True)

def subhead(text):
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before=Pt(10); p.paragraph_format.space_after=Pt(5); p.paragraph_format.keep_with_next=True
    r=p.add_run(text); set_run(r,11,True)

def fronthead(text):
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before=Pt(0); p.paragraph_format.space_after=Pt(18); p.paragraph_format.keep_with_next=True
    r=p.add_run(text.upper()); set_run(r,12,True)

def shade(cell,fill='E6E6E6'):
    tcPr=cell._tc.get_or_add_tcPr(); shd=tcPr.find(qn('w:shd'))
    if shd is None: shd=OxmlElement('w:shd'); tcPr.append(shd)
    shd.set(qn('w:fill'),fill)

def margins(cell,top=80,start=90,bottom=80,end=90):
    tc=cell._tc; tcPr=tc.get_or_add_tcPr(); mar=tcPr.first_child_found_in('w:tcMar')
    if mar is None: mar=OxmlElement('w:tcMar'); tcPr.append(mar)
    for m,v in [('top',top),('start',start),('bottom',bottom),('end',end)]:
        el=mar.find(qn('w:'+m))
        if el is None: el=OxmlElement('w:'+m); mar.append(el)
        el.set(qn('w:w'),str(v)); el.set(qn('w:type'),'dxa')

def style_table(t,header=True,font=9.2):
    t.autofit=True
    tblPr=t._tbl.tblPr; borders=tblPr.first_child_found_in('w:tblBorders')
    if borders is None: borders=OxmlElement('w:tblBorders'); tblPr.append(borders)
    for edge in ('top','left','bottom','right','insideH','insideV'):
        el=borders.find(qn('w:'+edge))
        if el is None: el=OxmlElement('w:'+edge); borders.append(el)
        el.set(qn('w:val'),'single'); el.set(qn('w:sz'),'4'); el.set(qn('w:space'),'0'); el.set(qn('w:color'),'777777')
    for ri,row in enumerate(t.rows):
        for cell in row.cells:
            cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER; margins(cell)
            if header and ri==0: shade(cell)
            for p in cell.paragraphs:
                p.alignment=WD_ALIGN_PARAGRAPH.LEFT; p.paragraph_format.space_after=Pt(2); p.paragraph_format.space_before=Pt(1); p.paragraph_format.line_spacing=1.0
                for r in p.runs: set_run(r,font,header and ri==0)
    if header and t.rows:
        trPr=t.rows[0]._tr.get_or_add_trPr(); rep=OxmlElement('w:tblHeader'); rep.set(qn('w:val'),'true'); trPr.append(rep)

def add_data_table(oldtable):
    rows=len(oldtable.rows); cols=len(oldtable.columns)
    t=doc.add_table(rows=rows,cols=cols)
    for ri,row in enumerate(oldtable.rows):
        for ci,cell in enumerate(row.cells):
            t.cell(ri,ci).text=cell.text
    first_row=' '.join(c.text for c in oldtable.rows[0].cells) if oldtable.rows else ''
    # The prototype comparison is text-heavy; a slightly smaller table type
    # keeps the complete comparison on the chapter page without reducing body text.
    style_table(t,True,8.0 if first_row.startswith('Capability') else 9.2)
    p=doc.add_paragraph(); p.paragraph_format.space_after=Pt(1); p.paragraph_format.space_before=Pt(1)
    return t

def add_research_table(headers, rows, font=9.0):
    """Add a compact academic comparison table with a repeatable header."""
    t=doc.add_table(rows=1,cols=len(headers))
    for ci,value in enumerate(headers): t.cell(0,ci).text=value
    for row in rows:
        cells=t.add_row().cells
        for ci,value in enumerate(row): cells[ci].text=value
    style_table(t,True,font)
    p=doc.add_paragraph(); p.paragraph_format.space_before=Pt(3); p.paragraph_format.space_after=Pt(4)
    return t

def research_note(lead, text):
    """Use ordinary academic prose for research interpretations and cautions."""
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_before=Pt(2); p.paragraph_format.space_after=Pt(7)
    p.paragraph_format.line_spacing=1.14; p.paragraph_format.first_line_indent=Inches(.25)
    set_run(p.add_run(lead+' '),10.5,True); set_run(p.add_run(text),10.5)
    return p

# Cover page, adapted to the academic report pattern without importing the reference's institution or supervisor.
p=para('PROJECT REPORT',WD_ALIGN_PARAGRAPH.CENTER,before=50,after=16,size=12,bold=True,indent=0,keep=True)
p=para('AGRICULTURAL DIGITAL TWINS FOR SMART IRRIGATION',WD_ALIGN_PARAGRAPH.CENTER,after=20,size=18,bold=True,indent=0,keep=True)
para('Research findings, digital-twin approaches and an uncertainty-aware irrigation prototype',WD_ALIGN_PARAGRAPH.CENTER,after=30,size=12,indent=0)
para('Submitted by',WD_ALIGN_PARAGRAPH.CENTER,after=8,size=11,indent=0)
for name,ident in [('Shishir Modi','2427010089'),('Pratyush Singh','2427010023'),('Nishanth Malladi','2427010087')]:
    para(f'{name}  |  {ident}',WD_ALIGN_PARAGRAPH.CENTER,after=4,size=11,bold=True,indent=0)
para('Agricultural Digital Twin Project',WD_ALIGN_PARAGRAPH.CENTER,before=26,after=4,size=11,bold=True,indent=0)
para('2 November 2026',WD_ALIGN_PARAGRAPH.CENTER,after=0,size=10,indent=0)
pagebreak()

# Source-material acknowledgment; no invented supervisor, department, or institutional endorsement.
fronthead('Acknowledgments')
para('The authors acknowledge the two supplied research papers, the review article on machine learning and digital twins in smart irrigation, the Agricultural Digital Twin project presentation and the Digital-Twin prototype files. These materials provide the research evidence and implementation context reviewed in this report.',indent=0)
pagebreak()

fronthead('Abstract')
abstract=('This report develops a research-oriented assessment of an agricultural digital-twin concept for irrigation under uncertain sensor data. It synthesizes two empirical studies: one on conformal prediction intervals for soil organic carbon, and one comparing machine-learning and deep-learning models for soil-moisture forecasting. It also reviews a recent smart-irrigation digital-twin synthesis and selected field projects. The report frames the supplied AgriTwin implementation as a decision-support research prototype, not as a validated irrigation controller. It defines research questions, an evidence boundary, a conceptual data-to-decision model, hypotheses for uncertainty-aware safety gating, and a staged evaluation protocol. The current browser implementation uses a ridge-regression surrogate, Open-Meteo or synthetic data, residual-based uncertainty bands and deterministic lock, hold, suspend and irrigate states. Findings indicate that uncertainty calibration, forecast skill, disease-risk logic and decision safety must be evaluated jointly. Real site-specific observations, temporal hold-out evaluation, fault injection, agronomic review and a supervised field pilot are required before claims about water savings, yield benefit or autonomous control can be supported.')
para(abstract,indent=0)
pagebreak()

fronthead('Contents')
contents=[
('Acknowledgments','i'),('Abstract','ii'),('Contents','iii'),('Chapter 1  Introduction','1'),('1.1 Problem and scope','1'),('1.2 Research aim and questions','1'),('1.3 Scope and analytical boundary','1'),('Chapter 2  Literature review','2'),('2.1 Uncertainty for soil organic carbon','2'),('2.2 Deep learning for soil moisture','3'),('2.3 Review of smart-irrigation twins','4'),('Chapter 3  Field landscape','5'),('Chapter 4  Proposed system and prototype','6'),('Chapter 5  Evaluation and metrics','8'),('Chapter 6  Research gaps and future work','10'),('Chapter 7  Conclusion','11'),('References','12')]
t=doc.add_table(rows=1,cols=2); t.cell(0,0).text='Contents'; t.cell(0,1).text='Page No'
for a,b in contents:
    cells=t.add_row().cells; cells[0].text=a; cells[1].text=b
style_table(t,True,9.5)
for row in t.rows[1:]:
    row.cells[1].paragraphs[0].alignment=WD_ALIGN_PARAGRAPH.CENTER
pagebreak()

# Reuse the current report body and data tables, converting its green callout cards to plain academic paragraphs.
chapter_names={
 '1. Problem and Scope':'CHAPTER 1: INTRODUCTION',
 '2. Research Evidence':'CHAPTER 2: LITERATURE REVIEW',
 '3. Field Landscape':'CHAPTER 3: FIELD LANDSCAPE',
 '4. AgriTwin Design and Implementation Status':'CHAPTER 4: PROPOSED SYSTEM AND PROTOTYPE',
 '5. Evaluation Framework and Metric Definitions':'CHAPTER 5: EVALUATION AND METRIC DEFINITIONS',
 '6. Research-Gap Mapping and Future Work':'CHAPTER 6: RESEARCH GAPS AND FUTURE WORK',
 '7. Conclusion':'CHAPTER 7: CONCLUSION',
 'References':'REFERENCES'
}
sub_map={
 '2.1 Uncertainty quantification for soil organic carbon':'2.1 Uncertainty quantification for soil organic carbon',
 '2.2 Deep-learning models for soil-moisture prediction':'2.2 Deep-learning models for soil-moisture prediction',
 '2.3 Review of ML and digital twins in smart irrigation':'2.3 Review of machine learning and digital twins in smart irrigation',
 '4.1 Intended project architecture':'4.1 Intended project architecture',
 '4.2 What the supplied prototype currently implements':'4.2 Current prototype implementation',
 '5.1 Recommended evaluation safeguards':'5.2 Recommended evaluation safeguards',
 '6.1 Roadmap':'6.1 Future-work roadmap'
}
started=False

def insert_before_chapter(next_heading):
    """Add the research scaffold immediately before a new chapter begins."""
    if next_heading=='2. Research Evidence':
        subhead('1.2 Research aim objectives and questions')
        para('The central research aim is to determine whether an uncertainty-aware digital-twin workflow can reduce unsafe irrigation recommendations when telemetry is incomplete, biased or outside the historical training distribution. The present report does not test that claim with field outcomes. It specifies the claim in a falsifiable form and identifies the observations required to test it.',indent=.25)
        para('The study objectives are to synthesize the supplied evidence, identify the methodological gap between forecasting studies and operational decision support, document the implemented prototype, and define a reproducible evaluation pathway. The dependent variables are forecast error, interval calibration, decision-state errors, irrigation-volume proxy and human-review burden. These outcomes separate predictive performance from decision quality.',indent=.25)
        add_research_table(['Research question','Operational evidence required'],[
            ['RQ1: Does the moisture model forecast site-specific soil state better than simple baselines?','MAE, RMSE and R2 on an untouched chronological test period, reported by site, depth, season and forecast horizon.'],
            ['RQ2: Are predicted intervals calibrated under clean and faulty telemetry?','Observed PICP and MPIW/PINAW against a stated nominal level under clean, dropout, drift and weather-shift scenarios.'],
            ['RQ3: Does uncertainty-aware gating improve irrigation decision safety?','Counts and rates of false irrigate, missed deficit, disease-conflict irrigation, lockouts and human escalations against a confidence-blind policy.'],
            ['RQ4: Can the system transfer beyond the simulator?','A prospective, supervised field pilot with measured soil moisture, irrigation records, weather, crop stage and grower overrides.']
        ],8.7)
        research_note('Proposed hypotheses.', 'H1: calibrated intervals will degrade less than point-only confidence under injected missingness when recalibrated from representative residuals. H2: an uncertainty gate will reduce unsafe recommendations during sensor faults, although it will increase locks and requests for human review. H3: a combined moisture and pathogen policy will reduce disease-conflict recommendations relative to a moisture-only rule. These are testable propositions, not results of the present prototype.')
        subhead('1.3 Scope and analytical boundary')
        para('The unit of analysis is a field-time observation, conceptually an hourly record containing soil state, weather, sensor-health indicators and an eventual recommendation. The target population is irrigated crop settings where soil moisture and weather observations can be aligned in time. The report treats the prototype as a reusable decision architecture; it does not assume that thresholds, model coefficients or disease-risk components transfer unchanged across crops, soils or regions.',indent=.25)
        para('The evaluation boundary ends before autonomous actuation. Water use, crop response, energy and disease outcomes must be measured rather than inferred from a simulator. A recommendation is therefore an intermediate research outcome. A reliable forecast alone does not demonstrate agronomic value, and an apparently sensible rule set does not demonstrate safety under real sensor drift or changing weather regimes.',indent=.25)
    elif next_heading=='3. Field Landscape':
        research_note('Synthesis of the literature review.', 'The three reviewed sources supply complementary but non-interchangeable evidence. The SOC study is most useful for interval calibration and sharpness; the soil-moisture study is most useful for temporal forecasting design; and the review article is most useful for architecture, deployment and adoption constraints. None directly validates closed-loop irrigation under telemetry failure. The proposed research design must therefore combine their contributions rather than treating any one study as end-to-end evidence.')
    elif next_heading=='5. Evaluation Framework and Metric Definitions':
        research_note('Prototype evidence boundary.', 'The documented browser implementation demonstrates data ingestion, surrogate forecasting, interval display and rule-based recommendation states. It does not establish external validity. The next chapter specifies the research design needed to move from a demonstration to evidence about performance, calibration and decision safety.')
    elif next_heading=='6. Research-Gap Mapping and Future Work':
        research_note('Interpretation of evaluated metrics.', 'The metrics should be read as a chain: point error evaluates forecast accuracy; coverage and width evaluate interval quality; then action-level error evaluates the consequence of using the forecast. A model with low error but under-covering intervals can still be unsafe if its uncertainty is used to permit irrigation.')
    elif next_heading=='7. Conclusion':
        subhead('6.2 Threats to validity and research controls')
        add_research_table(['Threat to validity','Why it matters','Control in the proposed study'],[
            ['Temporal leakage','Randomly mixing adjacent time records can make future information appear in training data.','Use chronological train, calibration and test partitions; preserve realistic forecast lead times.'],
            ['Spatial non-transferability','A model can appear accurate at familiar sites while failing on different soils or climates.','Report leave-site-out and site-stratified results where sufficient data are available.'],
            ['Fault-simulation realism','Independent random dropout does not capture drift, stuck sensors or communication bursts.','Inject multiple fault classes and compare them with measured device-quality logs.'],
            ['Outcome confounding','Rain, crop stage and grower choices affect water and crop outcomes alongside recommendations.','Log interventions and covariates; begin with supervised recommendations before causal field claims.'],
            ['Threshold specification','Fixed moisture or disease cut-offs can encode untested agronomic assumptions.','Obtain crop- and site-specific review, document rationale and test sensitivity to thresholds.']
        ],8.5)
        research_note('Research ethics and governance.', 'The pilot should retain human override, record the basis for every recommendation, protect farm and location data, and define a stop condition before valve integration. Recommendations that are uncertain, contradictory or outside validated conditions should request review rather than execute an irreversible action.')
for child in src._element.body.iterchildren():
    if child.tag==qn('w:p'):
        oldp=Paragraph(child,src); text=' '.join(oldp.text.split())
        if not started:
            if text=='1. Problem and Scope':
                started=True; chapter(chapter_names[text]); subhead('1.1 Problem and scope')
                continue
            continue
        if not text: continue
        if text in chapter_names:
            insert_before_chapter(text)
            if text=='References': pagebreak()
            else: pagebreak()
            chapter(chapter_names[text])
        elif text in sub_map:
            if text != '5.1 Recommended evaluation safeguards':
                subhead(sub_map[text])
            if text=='2.1 Uncertainty quantification for soil organic carbon':
                para('Study logic. This study asks whether machine-learning predictions can be accompanied by intervals whose stated confidence matches the frequency with which the intervals contain observed soil organic carbon values. It contrasts point accuracy with uncertainty quality. That distinction is important for irrigation because a narrow interval is useful only when its empirical coverage is credible.',indent=.25)
                para('Experimental design. The authors combine 2015 LUCAS Topsoil observations from the 0-20 cm layer with 28 environmental predictors, then compare bootstrap random forest, conformalized quantile random forest, quantile neural networks, quantile gradient boosting and quantile linear regression. The 10% target miscoverage corresponds to a nominal 90% interval. Repeated splits with five seeds make the reported scores less dependent on a single random partition, although this is not equivalent to validation under a future climate or a new geographic region.',indent=.25)
                research_note('Research relevance.', 'CQRF is the closest methodological precedent for AgriTwin because it combines a predictive model with a calibrated interval. However, the study predicts a largely static spatial property. Irrigation operates on a time series with autocorrelation, sensor outages and changing weather. The conformal result should therefore motivate an evaluation procedure, not be treated as a guarantee for the prototype.')
            elif text=='2.2 Deep-learning models for soil-moisture prediction':
                para('Study logic. Wang et al. investigate which model families retain predictive skill when soil moisture must be forecast across sites, depths and lead times. The work treats soil moisture as a multivariate temporal process in which previous moisture, meteorological forcing and soil temperature jointly inform the next state. Its research value for AgriTwin is the use of chronological forecasting tasks rather than a static regression target.',indent=.25)
                para('Experimental design. The study uses measurements from 30 ISMN sites at five depths between 0.05 m and 1.00 m. The covariates include precipitation, air temperature, longwave and shortwave radiation, wind speed, relative humidity, soil temperature and prior moisture values. Three conventional machine-learning methods and ten deep-learning structures are assessed with a four-day history for one-, three- and seven-day forecasts. A 6:2:2 chronological split and 25 neural-network repetitions are reported; SHAP and t-SNE are used to examine learned feature influence and representation structure.',indent=.25)
                research_note('Research relevance.', 'The reported variation by depth, site and horizon supports a stratified AgriTwin evaluation. A single average score could hide poor performance at a root-zone depth or during the weather transition that matters most for irrigation. The comparison also shows that a stronger neural architecture should be judged against a persistence baseline and operational cost, rather than selected only because it is more complex.')
            elif text=='2.3 Review of ML and digital twins in smart irrigation':
                para('Review logic. Bautista et al. conduct a structured synthesis of work published from 2019 to 2024. Of 246 initially retrieved records, 96 studies remain after screening. The review organizes the evidence across soil, weather and climate, crop characteristics, remote sensing or GIS, and IoT telemetry. It is a mapping of the field rather than a controlled experiment, so it identifies recurring design patterns and constraints rather than estimating one causal effect.',indent=.25)
                research_note('Research relevance.', 'The review anchors the proposed architecture in a complete data-to-decision chain: sensing, management, modeling, simulation, decision and actuation. It also explains why model accuracy alone is insufficient for deployment. Data reliability, interoperability, connectivity, interpretability, affordability and grower workflow are part of the research problem and should be measured or documented in a field pilot.')
            elif text=='4.1 Intended project architecture':
                para('Conceptual research model. AgriTwin can be represented as a sequence of four linked functions: observe the field, estimate latent soil state, quantify uncertainty, and choose a recommendation under safety constraints. The estimate is useful only when the time alignment, spatial representativeness and units of the inputs are known. The uncertainty signal then determines whether the system may issue a recommendation or must request review.',indent=.25)
                add_research_table(['Layer','Inputs and outputs','Research question'],[
                    ['Observation','Soil moisture, weather, crop stage, irrigation history and sensor-health flags.','Are measurements complete, synchronized and representative of the decision location?'],
                    ['State estimation','Forecasted soil-moisture state and prediction interval.','Is the forecast accurate and is the interval calibrated at the declared nominal level?'],
                    ['Risk assessment','Pathogen-risk proxy, threshold state and data-quality state.','Do rule components identify conditions in which irrigation should be held or suspended?'],
                    ['Decision and audit','IRRIGATE, HOLD, SUSPEND or LOCK, with reason codes.','Does the policy reduce harmful recommendations while preserving useful decisions?']
                ],8.6)
            elif text=='5.1 Recommended evaluation safeguards':
                subhead('5.1 Study design and experimental protocol')
                para('A defensible evaluation should use a nested chronological design. Earlier observations train candidate models, a later calibration window estimates interval residual quantiles and a final untouched period measures performance. No threshold, model-selection decision or missing-data rule should be tuned on the final period. If sites are sufficiently numerous, a second evaluation should withhold entire sites to measure geographic transfer.',indent=.25)
                add_research_table(['Experiment','Comparator','Primary outcomes'],[
                    ['E1: clean forecasting','Persistence, ridge regression, random forest and one recurrent or attention model.','MAE, RMSE and R2 by site, depth, lead time and season.'],
                    ['E2: uncertainty calibration','Nominal 90% interval with and without recalibration.','PICP, MPIW and PINAW under clean temporal hold-out data.'],
                    ['E3: telemetry stress test','Clean stream versus dropout, drift, stuck-sensor and delayed-packet conditions.','Metric degradation, PICP drift, lock rate and false-confidence rate.'],
                    ['E4: decision-policy ablation','Moisture-only, moisture plus pathogen, and uncertainty-gated policies.','Unsafe irrigation, missed deficit, disease-conflict irrigation, water proxy and human-review rate.']
                ],8.5)
                para('For each scenario, report the number of observations, sites, fault episodes and decision opportunities. Confidence intervals or repeated-seed summaries should accompany mean scores when stochastic models or randomized fault injections are used. Results should be disaggregated before aggregation: first by site and depth, then by forecast horizon and fault class. This makes failure modes visible instead of allowing an average to mask them.',indent=.25)
                subhead('5.2 Recommended evaluation safeguards')
        elif text.startswith('1. Problem and Scope') or text in ('Executive Summary','Report Structure'):
            continue
        elif oldp.style.name.startswith('List'):
            # Keep the original safety and evaluation lists, but use simple academic bullets.
            if re.match(r'^\d+\.',text):
                m=re.match(r'^(\d+\.\s*[^:]+:)(.*)$',text)
                p=doc.add_paragraph(); p.paragraph_format.left_indent=Inches(.28); p.paragraph_format.first_line_indent=Inches(-.20); p.paragraph_format.space_after=Pt(5); p.paragraph_format.line_spacing=1.12
                if m: set_run(p.add_run(m.group(1)),10.5,True); set_run(p.add_run(m.group(2)),10.5)
                else: set_run(p.add_run(text),10.5)
            else:
                p=doc.add_paragraph(); p.paragraph_format.left_indent=Inches(.3); p.paragraph_format.first_line_indent=Inches(-.2); p.paragraph_format.space_after=Pt(4); p.paragraph_format.line_spacing=1.12
                set_run(p.add_run('•  '+text),10.5)
        else:
            # Preserve source paragraph text; render as Times New Roman report prose.
            para(text,indent=.25)
    elif child.tag==qn('w:tbl') and started:
        old=Table(child,src)
        if len(old.rows)==1 and len(old.columns)==1:
            labeltext=' '.join(old.cell(0,0).text.split())
            if labeltext.startswith('AUTHORS'): continue
            match=re.match(r'^(Primary recommendation|Gap this project targets|Status)\s*(.*)$',labeltext)
            if match:
                p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.JUSTIFY; p.paragraph_format.space_before=Pt(4); p.paragraph_format.space_after=Pt(8); p.paragraph_format.line_spacing=1.14; p.paragraph_format.first_line_indent=Inches(.25)
                set_run(p.add_run(match.group(1)+'. '),10.5,True); set_run(p.add_run(match.group(2)),10.5)
            else: para(labeltext,indent=.25)
        else:
            add_data_table(old)

# Heading/paragraph widow control and output.
for p in doc.paragraphs:
    p.paragraph_format.widow_control=True
OUT.parent.mkdir(parents=True,exist_ok=True)
doc.save(str(OUT))
# Patch the package with the template's untouched parts; only document.xml is a planned body edit.
tmp=WORK/'rebuilt.docx'; shutil.copy2(OUT,tmp)
patched=WORK/'patched.docx'
with zipfile.ZipFile(TEMPLATE,'r') as zin, zipfile.ZipFile(tmp,'r') as new, zipfile.ZipFile(patched,'w',zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data=new.read('word/document.xml') if item.filename=='word/document.xml' else zin.read(item.filename)
        zout.writestr(item,data)
shutil.copy2(patched,OUT)
print(OUT)
