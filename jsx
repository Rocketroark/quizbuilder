import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Download, 
  Plus, 
  Trash2, 
  Edit2, 
  Bot, 
  Check, 
  X, 
  Copy, 
  RefreshCw, 
  AlertCircle,
  FileType,
  Hash,
  Wand2,
  Sparkles,
  Upload,
  FileUp,
  BrainCircuit,
  Package,
  PencilLine,
  AlertTriangle,
  Settings,
  Info
} from 'lucide-react';

/* Respondus Formatting Logic 
  - Multiple Choice: 1. Question \n a. Option \n *b. Correct Option
  - True/False: Same as MC, usually T/F options.
  - Multiple Response: Type: MR \n 1. Question \n *a. Correct \n b. Incorrect \n *c. Correct
  - Essay: Type: E \n 1. Question
  - Matching: Type: MT \n 1. Question \n a. Left = Right
  - Fill in Blank: Type: F \n 1. Question \n a. Answer 1 \n b. Answer 2
  - Fill in Multiple Blanks: Type: FMB \n 1. Roses are [red], violets are [blue].
  - Matching/Word Bank (Multiple Dropdown): Treated similarly to Matching or FMB depending on format. 
*/

const QUESTION_TYPES = {
  MC: { label: 'Multiple Choice', code: 'MC' },
  TF: { label: 'True / False', code: 'TF' },
  MR: { label: 'Multiple Response', code: 'MR' },
  MT: { label: 'Matching', code: 'MT' },
  E:  { label: 'Essay', code: 'E' },
  F:  { label: 'Fill in Blank', code: 'F' },
  FMB: { label: 'Fill in Multiple Blanks', code: 'FMB' },
  MD: { label: 'Multiple Dropdowns (Word Bank)', code: 'MD' } 
};

export default function RespondusApp() {
  const [questions, setQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState('manual'); 
  const [apiKey, setApiKey] = useState(''); 
  
  // -- Shared State --
  const [testBankName, setTestBankName] = useState('');

  // -- AI State --
  const [aiCourseNumber, setAiCourseNumber] = useState('');
  const [aiCourseName, setAiCourseName] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [aiPoints, setAiPoints] = useState(1);
  const [aiType, setAiType] = useState('MC');
  const [aiContext, setAiContext] = useState(''); 
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);
  
  // -- Import State --
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [importTypes, setImportTypes] = useState(Object.keys(QUESTION_TYPES));
  const [importPoints, setImportPoints] = useState(1);

  // -- Loading States --
  const [isRefining, setIsRefining] = useState(false);
  const [isDistracting, setIsDistracting] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // -- Manual Form State --
  const [editingId, setEditingId] = useState(null);
  const [formType, setFormType] = useState('MC');
  const [formPoints, setFormPoints] = useState(1);
  const [formQuestion, setFormQuestion] = useState('');
  const [formOptions, setFormOptions] = useState([{ text: '', isCorrect: false }]); 
  const [formPairs, setFormPairs] = useState([{ left: '', right: '' }]); 
  
  // Refs
  const previewRef = useRef(null);
  const formTopRef = useRef(null);
  const fileInputRef = useRef(null); 
  const importFileInputRef = useRef(null); 

  // -- Init --
  useEffect(() => {
    if (!window.JSZip) {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
    if (!window.mammoth) {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.2/mammoth.browser.min.js";
        script.async = true;
        document.body.appendChild(script);
    }
    if (!window.pdfjsLib) {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.async = true;
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
        };
        document.body.appendChild(script);
    }
  }, []);

  // --- Actions ---

  const addQuestion = () => {
    const newQ = {
      id: Date.now().toString(),
      type: formType,
      points: Number(formPoints),
      text: formQuestion,
      options: [...formOptions],
      pairs: [...formPairs]
    };

    if (editingId) {
      setQuestions(questions.map(q => q.id === editingId ? newQ : q));
      setEditingId(null);
    } else {
      setQuestions([...questions, newQ]);
    }
    resetForm();
  };

  const editQuestion = (q) => {
    setEditingId(q.id);
    setFormType(q.type);
    setFormPoints(q.points || 1);
    setFormQuestion(q.text);
    setFormOptions(q.options || []);
    setFormPairs(q.pairs || []);
    setActiveTab('manual');
    setTimeout(() => { formTopRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
  };

  const deleteQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const resetForm = () => {
    setFormQuestion('');
    setFormPoints(1);
    setFormOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }]);
    setFormPairs([{ left: '', right: '' }, { left: '', right: '' }]);
    setEditingId(null);
    setFormType('MC'); // Reset type to default to avoid state mismatches
  };

  const handleTypeChange = (newType) => {
    setFormType(newType);
    if(newType === 'TF') {
        setFormOptions([
            { text: 'True', isCorrect: true }, 
            { text: 'False', isCorrect: false }
        ]);
    } else if(['MC','MR','MD'].includes(newType)) {
        // If switching from TF or empty, give default options
        if(formOptions.length === 0 || (formOptions.length === 2 && formOptions[0].text === 'True')) {
             setFormOptions([
                { text: '', isCorrect: false }, 
                { text: '', isCorrect: false }, 
                { text: '', isCorrect: false }, 
                { text: '', isCorrect: false }
            ]);
        }
    } else if(newType === 'E') {
        setFormOptions([]);
    }
  };

  const handleOptionChange = (idx, field, value) => {
    const newOptions = [...formOptions];
    if (formType === 'MC' || formType === 'TF') {
      if (field === 'isCorrect') newOptions.forEach(o => o.isCorrect = false);
    }
    newOptions[idx][field] = value;
    setFormOptions(newOptions);
  };

  const addOption = () => { setFormOptions([...formOptions, { text: '', isCorrect: false }]); };
  const removeOption = (idx) => { setFormOptions(formOptions.filter((_, i) => i !== idx)); };
  
  const handlePairChange = (idx, field, value) => {
    const newPairs = [...formPairs];
    newPairs[idx][field] = value;
    setFormPairs(newPairs);
  };
  const addPair = () => { setFormPairs([...formPairs, { left: '', right: '' }]); };
  const removePair = (idx) => { setFormPairs(formPairs.filter((_, i) => i !== idx)); };

  const handleImportTypeChange = (typeCode) => {
    if (importTypes.includes(typeCode)) {
        setImportTypes(importTypes.filter(t => t !== typeCode));
    } else {
        setImportTypes([...importTypes, typeCode]);
    }
  };

  const validateQuestion = (q) => {
    const errors = [];
    if (!q.text || q.text.trim() === '') errors.push("Question text is missing");

    if (['MC', 'TF', 'MR'].includes(q.type)) {
        const correctCount = q.options ? q.options.filter(o => o.isCorrect).length : 0;
        if (correctCount === 0) errors.push("No correct answer selected");
        else if (['MC', 'TF'].includes(q.type) && correctCount > 1) errors.push(`Multiple correct answers for ${q.type}`);
        if (q.options && q.options.length < 2) errors.push("Fewer than 2 options");
    } 
    else if (q.type === 'MT') {
        if (!q.pairs || q.pairs.length < 2) errors.push("Fewer than 2 matching pairs");
    }
    else if (q.type === 'F') {
        if (!q.options || q.options.length === 0) errors.push("No accepted answers provided");
    }
    else if (q.type === 'FMB') {
        if (!/\[.*?\]/.test(q.text || '')) errors.push("No [bracketed] blanks found in text");
    }

    return errors;
  };

  const invalidQuestionsCount = questions.filter(q => validateQuestion(q).length > 0).length;

  const normalizeText = (text) => {
    return text
      .replace(/[\u2018\u2019]/g, "'") 
      .replace(/[\u201C\u201D]/g, '"') 
      .replace(/[\u2013\u2014]/g, '-') 
      .replace(/\u2026/g, '...')       
      .replace(/[^\x00-\x7F]/g, "")    
      .trim();
  };

  const normalizeTFQuestion = (question) => {
    if (question.type !== 'TF') return question;

    // Find which answer should be correct by checking common true/false patterns
    const correctAnswer = question.options?.find(opt => opt.isCorrect);
    if (!correctAnswer) {
      // Default to True if no correct answer found
      return {
        ...question,
        options: [
          { text: 'True', isCorrect: true },
          { text: 'False', isCorrect: false }
        ]
      };
    }

    // Check if the correct answer indicates true or false
    const correctText = correctAnswer.text?.toLowerCase().trim() || '';
    const isTrue = correctText.includes('true') || correctText.includes('t') || correctText === 'yes' || correctText === '1';

    return {
      ...question,
      options: [
        { text: 'True', isCorrect: isTrue },
        { text: 'False', isCorrect: !isTrue }
      ]
    };
  };

  const extractTextFromFile = async (file) => {
    const fileType = file.name.split('.').pop().toLowerCase();
    let rawText = "";

    if (fileType === 'docx') {
        if (!window.mammoth) return "Error: Docx parser not loaded.";
        const arrayBuffer = await file.arrayBuffer();
        const result = await window.mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        rawText = result.value;
    }
    else if (fileType === 'pdf') {
        if (!window.pdfjsLib) return "Error: PDF parser not loaded.";
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            rawText += pageText + "\n";
        }
    }
    else {
        rawText = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsText(file);
        });
    }

    return normalizeText(rawText);
  };

  const handleFileUpload = async (e, setFn) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsReadingFile(true);
    try {
        const text = await extractTextFromFile(file);
        setFn(prev => prev ? prev + "\n\n" + text : text); 
    } catch (err) {
        console.error("File read error:", err);
        alert("Failed to read file.");
    } finally {
        setIsReadingFile(false);
    }
  };

  const callGemini = async (prompt) => {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    if (!data.candidates || !data.candidates[0].content) throw new Error("No response from AI");
    let text = data.candidates[0].content.parts[0].text;
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
  };

  const improveQuestion = async () => {
    if (!formQuestion) return;
    setIsRefining(true);
    try {
        const result = await callGemini(`Rewrite the following quiz question to be more clear, concise, and academic. Return ONLY the text of the new question:\n\n"${formQuestion}"`);
        setFormQuestion(result);
    } catch (e) {
        alert("Failed to refine question.");
    } finally {
        setIsRefining(false);
    }
  };

  const generateDistractors = async () => {
    const correctOpt = formOptions.find(o => o.isCorrect);
    if (!correctOpt || !correctOpt.text || !formQuestion) {
        alert("Please enter a Question and a Correct Answer first.");
        return;
    }
    setIsDistracting(true);
    try {
        const prompt = `
            I have a multiple choice question: "${formQuestion}"
            The correct answer is: "${correctOpt.text}"
            Generate 3 plausible but INCORRECT distractors.
            Return ONLY a valid JSON array of strings. Example: ["Wrong A", "Wrong B", "Wrong C"]
        `;
        const resultStr = await callGemini(prompt);
        const distractors = JSON.parse(resultStr);
        const newOptions = [correctOpt];
        distractors.forEach(d => newOptions.push({ text: d, isCorrect: false }));
        setFormOptions(newOptions);
    } catch (e) {
        alert("Failed to generate distractors.");
    } finally {
        setIsDistracting(false);
    }
  };

  const parseImportWithGemini = async () => {
    if (!importText) return;
    setIsImporting(true);
    try {
        const prompt = `
            Parse raw quiz text into structured JSON.
            Focus ONLY on types: ${importTypes.join(', ')}.
            Raw Text: """${importText.substring(0, 40000)}"""
            Schema: { "type": "MC" | "TF" | "MR" | "MT" | "F" | "E" | "FMB" | "MD", "text": "Question text", "options": [{ "text": "opt text", "isCorrect": boolean }], "pairs": [{ "left": "a", "right": "b" }] }
        `;
        const resultStr = await callGemini(prompt);
        let parsedData;
        try {
             parsedData = JSON.parse(resultStr);
             if (!Array.isArray(parsedData)) throw new Error("AI did not return an array");
        } catch (e) {
             console.error("JSON Parse error", e);
             alert("Failed to parse AI response.");
             return;
        }

        const parsedQuestions = parsedData.map(q => {
            const baseQuestion = {
                ...q,
                options: q.options || [],
                pairs: q.pairs || [],
                id: Date.now() + Math.random().toString(),
                points: Number(importPoints)
            };
            return normalizeTFQuestion(baseQuestion);
        });
        setQuestions([...questions, ...parsedQuestions]);
        setImportText('');
        setActiveTab('manual'); 
    } catch (e) {
        alert("Failed to parse.");
    } finally {
        setIsImporting(false);
    }
  };

  const generateGeminiQuestions = async () => {
    if (!testBankName) { alert("Please enter a Test Bank Name."); return; }
    setIsGenerating(true);
    setAiError(null);
    const contextPart = (aiCourseName || aiCourseNumber) ? `Course: ${aiCourseNumber} ${aiCourseName}. ` : '';
    const referenceMaterial = aiContext ? `\n\nREFERENCE MATERIAL:\n"""${aiContext.substring(0, 20000)}"""\n` : '';
    const promptText = `Generate ${aiCount} ${QUESTION_TYPES[aiType].label} questions for "${testBankName}". ${contextPart} ${referenceMaterial} Format: JSON array. No markdown. Schema: { "type": "${aiType}", "text": "Q", "options": [{ "text": "o", "isCorrect": bool }], "pairs": [{ "left": "a", "right": "b" }] }`;
    try {
      const text = await callGemini(promptText);
      let parsedData;
      try {
           parsedData = JSON.parse(text);
           if (!Array.isArray(parsedData)) throw new Error("AI did not return an array");
      } catch (e) {
           console.error("JSON Parse error", e);
           setAiError("AI response was not valid JSON.");
           return;
      }

      const newQuestions = parsedData.map(q => {
        const baseQuestion = {
          ...q,
          options: q.options || [],
          pairs: q.pairs || [],
          id: Date.now() + Math.random().toString(),
          points: Number(aiPoints)
        };
        return normalizeTFQuestion(baseQuestion);
      });
      setQuestions([...questions, ...newQuestions]);
      setActiveTab('preview');
    } catch (err) {
      setAiError("Failed to generate.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- QTI Export ---
  const generateQTI = async () => {
    if (!window.JSZip || questions.length === 0) return;
    setIsZipping(true);
    try {
        const zip = new window.JSZip();
        const manifestID = "MANIFEST_" + Date.now();
        const resourceID = "RESOURCE_" + Date.now();
        const cleanName = testBankName ? testBankName.replace(/[^a-z0-9]/gi, '_') : "question_bank";
        const xmlFileName = `${cleanName}.xml`;

        const manifestXML = `<?xml version="1.0" encoding="UTF-8"?><manifest identifier="${manifestID}" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"><metadata><schema>IMS Content</schema><schemaversion>1.1.3</schemaversion></metadata><organizations><organization identifier="ORG_1"><item identifier="ITEM_1" identifierref="${resourceID}"><title>${testBankName}</title></item></organization></organizations><resources><resource identifier="${resourceID}" type="imsqti_xmlv1p1" href="${xmlFileName}"><file href="${xmlFileName}" /></resource></resources></manifest>`;

        const itemsXML = questions.map((q, i) => {
            const qID = `QUE_${1000 + i}`;
            const rID = `${qID}_RL`;
            let renderBlock = "";
            let resProcessing = "";
            
            // Standard Multiple Choice / True False
            if (['MC', 'TF'].includes(q.type)) {
                const optionsXML = q.options.map((opt, optIdx) => 
                    `<response_label ident="${qID}_A${optIdx+1}"><material><mattext>${opt.text}</mattext></material></response_label>`
                ).join('');
                renderBlock = `<response_lid ident="${rID}" rcardinality="Single" rtiming="No"><render_choice>${optionsXML}</render_choice></response_lid>`;
                
                const conditions = q.options.map((opt, optIdx) => {
                    const score = opt.isCorrect ? q.points : 0;
                    return `<respcondition><conditionvar><varequal respident="${rID}">${qID}_A${optIdx+1}</varequal></conditionvar><setvar varname="que_score" action="Set">${score}</setvar></respcondition>`;
                }).join('');
                resProcessing = `<resprocessing><outcomes><decvar vartype="Integer" defaultval="0" varname="que_score" maxvalue="${q.points}"/></outcomes>${conditions}</resprocessing>`;
            } 
            // Multiple Response - Partial Credit
            else if (['MR'].includes(q.type)) {
                const optionsXML = q.options.map((opt, optIdx) =>
                    `<response_label ident="${qID}_A${optIdx+1}"><material><mattext>${opt.text}</mattext></material></response_label>`
                ).join('');
                renderBlock = `<response_lid ident="${rID}" rcardinality="Multiple" rtiming="No"><render_choice>${optionsXML}</render_choice></response_lid>`;

                const correctOptions = q.options.filter(o => o.isCorrect).length;
                const pointsPerCorrect = correctOptions > 0 ? (q.points / correctOptions).toFixed(4) : 0;

                const conditions = q.options.map((opt, optIdx) => {
                    // Add points for correct answers, do nothing (or could subtract) for incorrect
                    const action = opt.isCorrect ? "Add" : "Add";
                    const score = opt.isCorrect ? pointsPerCorrect : 0;
                    return `<respcondition><conditionvar><varequal respident="${rID}">${qID}_A${optIdx+1}</varequal></conditionvar><setvar varname="que_score" action="${action}">${score}</setvar></respcondition>`;
                }).join('');
                resProcessing = `<resprocessing><outcomes><decvar vartype="Decimal" defaultval="0" varname="que_score" minvalue="0" maxvalue="${q.points}"/></outcomes>${conditions}</resprocessing>`;
            }
            // Essay
            else if (q.type === 'E') {
                renderBlock = `<response_str ident="${rID}" rcardinality="Single"><render_fib><response_label ident="${rID}_L" rshuffle="No"/></render_fib></response_str>`;
                resProcessing = `<resprocessing><outcomes><decvar vartype="Integer" defaultval="0" varname="que_score" maxvalue="${q.points}"/></outcomes></resprocessing>`; 
            }
            // Fill in Blank (Single blank - no partial credit)
            else if (q.type === 'F') {
                renderBlock = `<response_str ident="${rID}" rcardinality="Single"><render_fib><response_label ident="${rID}_L" rshuffle="No"/></render_fib></response_str>`;

                const conditions = q.options.map(opt =>
                    `<respcondition><conditionvar><varequal respident="${rID}" case="No">${opt.text}</varequal></conditionvar><setvar varname="que_score" action="Set">${q.points}</setvar></respcondition>`
                ).join('');
                resProcessing = `<resprocessing><outcomes><decvar vartype="Integer" defaultval="0" varname="que_score" maxvalue="${q.points}"/></outcomes>${conditions}</resprocessing>`;
            }
            // Fill in Multiple Blanks / Multiple Dropdowns (Partial credit)
            else if (['FMB', 'MD'].includes(q.type)) {
                // Extract blanks from question text [blank1], [blank2], etc.
                const blanks = q.text.match(/\[([^\]]+)\]/g) || [];
                const numBlanks = blanks.length > 0 ? blanks.length : 1;
                const pointsPerBlank = (q.points / numBlanks).toFixed(4);

                // Create multiple response items, one for each blank
                const responseItems = blanks.map((blank, idx) => {
                    const blankID = `${rID}_B${idx + 1}`;
                    return `<response_str ident="${blankID}" rcardinality="Single"><render_fib><response_label ident="${blankID}_L" rshuffle="No"/></render_fib></response_str>`;
                }).join('');

                renderBlock = responseItems || `<response_str ident="${rID}" rcardinality="Single"><render_fib><response_label ident="${rID}_L" rshuffle="No"/></render_fib></response_str>`;

                // Create conditions for each blank - each blank worth partial credit
                const conditions = blanks.map((blank, idx) => {
                    const blankID = `${rID}_B${idx + 1}`;
                    const blankAnswer = blank.replace(/[\[\]]/g, ''); // Extract answer from [answer]
                    return `<respcondition><conditionvar><varequal respident="${blankID}" case="No">${blankAnswer}</varequal></conditionvar><setvar varname="que_score" action="Add">${pointsPerBlank}</setvar></respcondition>`;
                }).join('');

                resProcessing = `<resprocessing><outcomes><decvar vartype="Decimal" defaultval="0" varname="que_score" minvalue="0" maxvalue="${q.points}"/></outcomes>${conditions}</resprocessing>`;
            }
            // Matching - Partial Credit
            else if (q.type === 'MT') {
                const numPairs = q.pairs.length;
                const pointsPerPair = numPairs > 0 ? (q.points / numPairs).toFixed(4) : 0;

                // Create separate response items for each left-side item
                const responseItems = q.pairs.map((pair, idx) => {
                    const pairID = `${rID}_P${idx + 1}`;
                    const choicesXML = q.pairs.map((p, cIdx) =>
                        `<response_label ident="${qID}_R${cIdx}"><material><mattext>${p.right}</mattext></material></response_label>`
                    ).join('');
                    return `<material><mattext>${pair.left}</mattext></material><response_lid ident="${pairID}" rcardinality="Single"><render_choice>${choicesXML}</render_choice></response_lid>`;
                }).join('');

                renderBlock = responseItems;

                // Create conditions for each pair - partial credit
                const conditions = q.pairs.map((pair, idx) => {
                    const pairID = `${rID}_P${idx + 1}`;
                    const correctChoice = `${qID}_R${idx}`;
                    return `<respcondition><conditionvar><varequal respident="${pairID}">${correctChoice}</varequal></conditionvar><setvar varname="que_score" action="Add">${pointsPerPair}</setvar></respcondition>`;
                }).join('');

                resProcessing = `<resprocessing><outcomes><decvar vartype="Decimal" defaultval="0" varname="que_score" minvalue="0" maxvalue="${q.points}"/></outcomes>${conditions}</resprocessing>`;
            }

            return `<item title="Question ${i+1}" ident="${qID}"><presentation><material><mattext texttype="text/html"><![CDATA[${q.text}]]></mattext></material>${renderBlock}</presentation>${resProcessing}</item>`;
        }).join('\n');

        const assessmentXML = `<?xml version="1.0" encoding="ISO-8859-1"?><questestinterop><assessment title="${testBankName}" ident="A_${Date.now()}"><section title="Main" ident="S_${Date.now()}">${itemsXML}</section></assessment></questestinterop>`;

        zip.file("imsmanifest.xml", manifestXML);
        zip.file(xmlFileName, assessmentXML);
        const content = await zip.generateAsync({type:"blob"});
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = `${cleanName}_QTI.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        alert("Zip creation failed.");
    } finally {
        setIsZipping(false);
    }
  };

  const generateTxt = () => {
    if (questions.length === 0) return "Add questions.";
    let output = "";
    let pts = null;
    questions.forEach((q, index) => {
      if (q.points !== pts) { output += `Points: ${q.points}\n`; pts = q.points; }
      if (q.type === 'MR') output += "Type: MR\n";
      if (q.type === 'MT') output += "Type: MT\n";
      if (q.type === 'E')  output += "Type: E\n";
      if (q.type === 'F')  output += "Type: F\n";
      if (q.type === 'FMB') output += "Type: FMB\n"; 
      if (q.type === 'MD')  output += "Type: FMB\n"; 
      output += `${index + 1}. ${q.text}\n`;
      if (['MC', 'TF', 'MR', 'MD'].includes(q.type)) {
        q.options.forEach((opt, idx) => {
          const char = String.fromCharCode(97 + idx);
          const mk = opt.isCorrect ? '*' : '';
          output += `${mk}${char}. ${opt.text}\n`;
        });
      } else if (q.type === 'MT') {
        q.pairs.forEach((pair, idx) => {
          const char = String.fromCharCode(97 + idx);
          output += `${char}. ${pair.left} = ${pair.right}\n`;
        });
      } else if (q.type === 'F') {
        q.options.forEach((opt, idx) => {
          const char = String.fromCharCode(97 + idx);
          output += `${char}. ${opt.text}\n`;
        });
      }
      output += '\n';
    });
    return output;
  };

  const downloadFile = () => {
    const content = generateTxt();
    const safeName = testBankName ? testBankName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'question_bank';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = () => navigator.clipboard.writeText(generateTxt());

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-blue-900 text-white p-4 shadow-md flex justify-between items-center z-10">
        <div className="flex items-center gap-2"><FileType className="w-6 h-6 text-yellow-400" /><h1 className="text-xl font-bold tracking-tight">LUQuestion <span className="font-light opacity-80">Banker</span></h1></div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-blue-800 px-2 py-1 rounded text-blue-200 hidden sm:inline-block">{questions.length} Questions</span>
          <button onClick={generateQTI} disabled={isZipping || questions.length === 0} className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded text-sm disabled:opacity-50">{isZipping ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Package className="w-4 h-4" />} <span className="hidden sm:inline">Export QTI</span></button>
          <button onClick={downloadFile} className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-blue-900 font-semibold rounded text-sm transition-colors shadow-sm"><Download className="w-4 h-4" /> <span className="hidden sm:inline">Export {testBankName ? `"${testBankName}"` : '.txt'}</span></button>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-full md:w-1/2 flex flex-col border-r border-slate-200 bg-white">
          <div className="flex border-b border-slate-200">
            {['manual', 'import', 'ai'].map(t => (
                <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-3 text-sm font-medium flex justify-center items-center gap-2 capitalize ${activeTab === t ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}>{t === 'ai' ? <BrainCircuit className="w-4 h-4" /> : t === 'import' ? <FileUp className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />} {t === 'ai' ? 'Gemini' : t}</button>
            ))}
            <button onClick={() => setActiveTab('preview')} className="flex-1 md:hidden py-3 text-sm font-medium flex justify-center items-center gap-2 text-slate-500 hover:bg-slate-50"><FileText className="w-4 h-4" /> Preview</button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'manual' && (
              <div className="max-w-xl mx-auto space-y-6" ref={formTopRef}>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
                  <div className="mb-4"><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Test Bank Name</label><div className="relative"><PencilLine className="w-4 h-4 absolute left-3 top-3 text-slate-400" /><input type="text" value={testBankName} onChange={(e) => setTestBankName(e.target.value)} placeholder="Midterm_Exam" className="w-full pl-9 p-2 border border-slate-300 rounded text-sm" /></div></div>
                  <div className="flex justify-between items-center mb-4 border-t border-slate-100 pt-4"><h3 className="font-semibold text-slate-800">{editingId ? 'Edit' : 'New'} Question</h3>{editingId && <button onClick={resetForm} className="text-xs text-red-500">Cancel</button>}</div>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1"><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Type</label><select value={formType} onChange={(e) => handleTypeChange(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded text-sm">{Object.values(QUESTION_TYPES).map(t => <option key={t.code} value={t.code}>{t.label}</option>)}</select></div>
                        <div className="w-24"><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Points</label><input type="number" min="0" step="0.1" value={formPoints} onChange={(e) => setFormPoints(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded text-sm" /></div>
                    </div>
                    <div>
                      <div className="flex justify-between items-end mb-1"><label className="block text-xs font-semibold text-slate-500 uppercase">Question Text {formType === 'FMB' && <span className="text-slate-400 font-normal">(Use [brackets] for blanks)</span>}</label><button onClick={improveQuestion} disabled={!formQuestion || isRefining} className="text-[10px] text-purple-600 bg-purple-50 px-2 py-1 rounded flex items-center gap-1">{isRefining ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3" />} Improve</button></div>
                      <textarea value={formQuestion} onChange={(e) => setFormQuestion(e.target.value)} placeholder={formType === 'FMB' ? "Roses are [red]." : "Type question..."} className="w-full p-2 bg-white border border-slate-300 rounded text-sm min-h-[80px]" />
                    </div>
                    {['MC', 'MR', 'F', 'TF', 'MD'].includes(formType) && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <label className="block text-xs font-semibold text-slate-500 uppercase">{formType === 'F' ? 'Accepted Answers' : 'Options'}</label>
                            {['MR', 'FMB', 'MD'].includes(formType) && <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded flex items-center gap-1"><Info className="w-3 h-3" /> Partial Credit Enabled</span>}
                            {['MC', 'MR'].includes(formType) && <button onClick={generateDistractors} disabled={!formQuestion || isDistracting} className="text-[10px] text-orange-600 bg-orange-50 px-2 py-1 rounded flex items-center gap-1"><Sparkles className="w-3 h-3" /> Distractors</button>}
                        </div>
                        {formOptions.map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            {formType !== 'F' && <button onClick={() => handleOptionChange(idx, 'isCorrect', !opt.isCorrect)} className={`w-6 h-6 rounded-full flex items-center justify-center border ${opt.isCorrect ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-300 text-slate-300'}`}><Check className="w-3 h-3" /></button>}
                            <input type="text" value={opt.text} onChange={(e) => handleOptionChange(idx, 'text', e.target.value)} className="flex-1 p-2 border border-slate-300 rounded text-sm" />
                            {formType !== 'TF' && <button onClick={() => removeOption(idx)} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>}
                          </div>
                        ))}
                        {formType !== 'TF' && <button onClick={addOption} className="text-xs text-blue-600 flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>}
                      </div>
                    )}
                    {formType === 'MT' && (
                      <div className="space-y-2">
                         <label className="block text-xs font-semibold text-slate-500 uppercase">Pairs</label>
                        {formPairs.map((pair, idx) => (
                          <div key={idx} className="flex items-center gap-2"><input type="text" value={pair.left} onChange={(e) => handlePairChange(idx, 'left', e.target.value)} placeholder="Left" className="flex-1 p-2 border border-slate-300 rounded text-sm" /><span>=</span><input type="text" value={pair.right} onChange={(e) => handlePairChange(idx, 'right', e.target.value)} placeholder="Right" className="flex-1 p-2 border border-slate-300 rounded text-sm" /><button onClick={() => removePair(idx)} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button></div>
                        ))}
                        <button onClick={addPair} className="text-xs text-blue-600 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Pair</button>
                      </div>
                    )}
                    <button onClick={addQuestion} disabled={!formQuestion} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium mt-4">{editingId ? 'Update' : 'Add'}</button>
                  </div>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-end"><h3 className="font-bold text-slate-700 text-sm uppercase">Questions ({questions.length})</h3>{invalidQuestionsCount > 0 && <span className="text-xs text-red-600 font-bold bg-red-50 px-2 py-1 rounded flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {invalidQuestionsCount} need attention</span>}</div>
                    {questions.map((q, i) => {
                        const errs = validateQuestion(q);
                        return (
                            <div key={q.id} className={`bg-white p-3 rounded border ${errs.length > 0 ? 'border-red-300 bg-red-50' : 'border-slate-200'} hover:border-blue-300 flex justify-between items-start`}>
                                <div className="flex gap-3 w-full"><span className="bg-slate-100 text-slate-500 font-mono text-xs px-2 py-1 rounded h-fit">{q.type}</span><div className="text-sm text-slate-800 flex-1"><div className="flex justify-between"><span>{i + 1}. {q.text.substring(0,60)}...</span><span className="ml-2 text-xs text-slate-400">({q.points} pts)</span></div>{errs.length > 0 && <div className="mt-1 space-y-1">{errs.map((e, idx) => <p key={idx} className="text-xs text-red-600 flex items-center gap-1 font-semibold"><AlertTriangle className="w-3 h-3" /> {e}</p>)}</div>}</div></div>
                                <div className="flex gap-1 ml-2"><button onClick={() => editQuestion(q)} className="text-slate-400 hover:text-blue-600"><Edit2 className="w-3.5 h-3.5" /></button><button onClick={() => deleteQuestion(q.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></div>
                            </div>
                        );
                    })}
                </div>
              </div>
            )}
            {activeTab === 'import' && (
                <div className="max-w-xl mx-auto space-y-6">
                    <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-2 mb-4"><FileUp className="w-6 h-6 text-orange-600" /><h2 className="text-lg font-bold text-orange-900">Import Questions</h2></div>
                        <div className="mb-4"><label className="block text-xs font-bold text-orange-800 uppercase mb-1">Test Bank Name</label><input type="text" value={testBankName} onChange={(e) => setTestBankName(e.target.value)} placeholder="Midterm_Exam" className="w-full p-2 border border-orange-200 rounded-md font-medium" /></div>
                        <div className="mb-4"><label className="block text-xs font-bold text-orange-800 uppercase mb-2">Select Types to Import</label><div className="grid grid-cols-2 gap-2">{Object.values(QUESTION_TYPES).map(t => (<label key={t.code} className="flex items-center gap-2 text-sm text-orange-900 cursor-pointer"><input type="checkbox" checked={importTypes.includes(t.code)} onChange={() => handleImportTypeChange(t.code)} className="rounded text-orange-600 focus:ring-orange-500" />{t.label}</label>))}</div></div>
                        <div className="mb-4"><label className="block text-xs font-bold text-orange-800 uppercase mb-1">Default Points per Question</label><input type="number" min="0" step="0.1" value={importPoints} onChange={(e) => setImportPoints(e.target.value)} className="w-24 p-2 border border-orange-200 rounded-md" /></div>
                        <div className="space-y-4">
                            <div><label className="block text-xs font-bold text-orange-800 uppercase mb-1">Paste Quiz Text</label><textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="1. Question..." className="w-full p-3 border border-orange-200 rounded-md h-48 text-sm font-mono" /></div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-orange-700 uppercase font-bold">Or Upload File:</span>
                                {isReadingFile && <RefreshCw className="w-4 h-4 animate-spin text-orange-600"/>}
                                <input type="file" ref={importFileInputRef} onChange={(e) => handleFileUpload(e, setImportText)} className="text-xs" disabled={isReadingFile} />
                            </div>
                            <button onClick={parseImportWithGemini} disabled={!importText || isImporting || isReadingFile} className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded font-bold shadow-md flex justify-center items-center gap-2 disabled:opacity-50">{isImporting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Parse with Gemini</button>
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'ai' && (
              <div className="max-w-xl mx-auto space-y-6">
                 <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-4"><BrainCircuit className="w-6 h-6 text-purple-600" /><h2 className="text-lg font-bold text-purple-900">Gemini Generator</h2></div>
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1"><label className="block text-xs font-bold text-purple-800 uppercase mb-1">Course #</label><input type="text" value={aiCourseNumber} onChange={(e) => setAiCourseNumber(e.target.value)} placeholder="BIO 101" className="w-full p-2 border border-purple-200 rounded-md" /></div>
                            <div className="flex-[2]"><label className="block text-xs font-bold text-purple-800 uppercase mb-1">Course Name</label><input type="text" value={aiCourseName} onChange={(e) => setAiCourseName(e.target.value)} placeholder="Biology" className="w-full p-2 border border-purple-200 rounded-md" /></div>
                        </div>
                        <div><label className="block text-xs font-bold text-purple-800 uppercase mb-1">Test Bank Name</label><input type="text" value={testBankName} onChange={(e) => setTestBankName(e.target.value)} placeholder="Midterm_Exam" className="w-full p-2 border border-purple-200 rounded-md font-medium" /></div>
                        <div className="bg-white p-3 rounded border border-purple-100">
                             <label className="block text-xs font-bold text-purple-800 uppercase mb-2 flex items-center gap-2"><FileUp className="w-3 h-3" /> Reference Material</label>
                             <textarea value={aiContext} onChange={(e) => setAiContext(e.target.value)} placeholder="Paste content..." className="w-full p-2 border border-slate-200 rounded text-xs h-24 mb-2" />
                             <div className="flex items-center gap-2">
                                {isReadingFile && <RefreshCw className="w-3 h-3 animate-spin text-purple-600"/>}
                                <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e, setAiContext)} className="text-xs text-slate-500" disabled={isReadingFile} />
                             </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1"><label className="block text-xs font-bold text-purple-800 uppercase mb-1">Count</label><select value={aiCount} onChange={(e) => setAiCount(e.target.value)} className="w-full p-2 border border-purple-200 rounded-md">{[1, 3, 5, 10, 15].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                            <div className="flex-1"><label className="block text-xs font-bold text-purple-800 uppercase mb-1">Points</label><input type="number" min="0" step="0.1" value={aiPoints} onChange={(e) => setAiPoints(e.target.value)} className="w-full p-2 border border-purple-200 rounded-md" /></div>
                            <div className="flex-1"><label className="block text-xs font-bold text-purple-800 uppercase mb-1">Type</label><select value={aiType} onChange={(e) => setAiType(e.target.value)} className="w-full p-2 border border-purple-200 rounded-md">{Object.values(QUESTION_TYPES).map(t => <option key={t.code} value={t.code}>{t.label}</option>)}</select></div>
                        </div>
                        {aiError && <div className="p-3 bg-red-100 text-red-700 rounded text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {aiError}</div>}
                        <button onClick={generateGeminiQuestions} disabled={!testBankName || isGenerating || isReadingFile} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold shadow-md flex justify-center items-center gap-2 disabled:opacity-50">{isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Generate with Gemini</button>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>
        <div className={`fixed inset-0 z-20 bg-white transform transition-transform duration-300 md:relative md:translate-x-0 md:w-1/2 md:flex flex-col bg-slate-100 ${activeTab === 'preview' ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center gap-2"><button onClick={() => setActiveTab('manual')} className="text-slate-500"><X className="w-6 h-6" /></button><span className="font-bold text-slate-800">Preview</span></div>
          <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm"><div><h2 className="font-bold text-slate-700">Document Preview</h2><p className="text-xs text-slate-400">Filename: {testBankName ? `${testBankName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt` : 'question_bank.txt'}</p></div><button onClick={copyToClipboard} className="text-slate-500 hover:text-blue-600 p-2 rounded"><Copy className="w-5 h-5" /></button></div>
          <div className="flex-1 overflow-auto p-8 bg-slate-100"><div className="bg-white shadow-lg min-h-[800px] p-12 max-w-3xl mx-auto rounded-sm relative"><div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-t-sm opacity-50"></div><pre ref={previewRef} className="font-serif text-slate-900 whitespace-pre-wrap text-sm leading-relaxed" style={{ fontFamily: '"Times New Roman", Times, serif' }}>{generateTxt()}</pre></div></div>
        </div>
      </div>
    </div>
  );
}
