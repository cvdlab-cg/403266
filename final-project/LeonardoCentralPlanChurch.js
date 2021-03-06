/* 403266: Fabrizio Andreoli
** LeonardoCentralPlanChurch.js
** Model of a Leonardo's central-plan church
**
** http://en.wahooart.com/A55A04/w.nsf/Opra/BRUE-8EWLBQ
** http://www.museoscienza.org/dipartimenti/catalogo_collezioni/scheda_oggetto.asp?idk_in=ST070-00051&arg=Leonardo
** http://www.museoscienza.org/dipartimenti/catalogo_collezioni/scheda_oggetto.asp?idk_in=ST070-00130&arg=Leonardo
*/

(function (exports) {
	var doShow = !false; // developing...can bypass the show...
	var simplify= false; // Simplify geometry!
	var ctrl = null; // Used to control the camera...// ctrl.object.position
	if (p && p.controls)
	{
		ctrl = p.controls.controls; // Undocumented p [exports.Plasm.plasm.Viewer]
	}

	// Global parameters definition: determine the shape and the size of the buildings
	var sf = 1; // Scale factor
	var nRibs = 8; // Octagonal cupolas
	var radiusMainCupola = 4*sf;
	var radiusMiniCupola = 1*sf;
	var miniCupolaDispose = radiusMainCupola + radiusMiniCupola; // Represent the length of the to catetis distance from center multiplied by sin(PI/4)
	var cww=0.30*sf; // Cupola wall's width
	var baseStepsRadius = radiusMainCupola*(3+Math.sqrt(2))/2 + radiusMiniCupola;
	var baseStepsWidth = cww/2;
	var baseStepsSlices = 32;
	var zBaseCupola = 3*sf; // Z of the base of the cupolas
	var hWallMainCupola = radiusMainCupola; 
	var hWallMiniCupola = hWallMainCupola*radiusMiniCupola/radiusMainCupola; 
	var typeMainCupola = 1; // Round Arch
	var typeMiniCupola = 1; // Round Arch
	var typeExpCupola = 3; // Very thin Lancet Arch
	var columnRadius = (miniCupolaDispose/Math.sin(PI/4) - radiusMiniCupola - cww/2); // radiusMainCupola + cww*1.1;
	var nDivCol = (1 << (simplify?3:4)); // Must be a power of two (to speed up...)
	var floorProfileLength = radiusMainCupola; // *(3+Math.sqrt(2))/2
	var floorProfileScale = 0.8;
	var hFloor1 = cww;
	var hColumnBrick = (zBaseCupola)/nDivCol; // Height of a brick of the column
//	var hColumnBrick = (zBaseCupola + hWallMainCupola)/nDivCol; // Height of a brick of the column

	// rz's arrays instead of [X,Y,Z] have [Radius,Z] elements
	var rzTopMiniCupolas = [[50,0], // [0,0] in order to have a closed object (at bottom).
 													[50,0], [100, 0], [100, 0], [110, 10], [ 120,30], [105,50], [50,75], [0,100]]; // Closing the top of the TopMiniCupolas
	rzTopMiniCupolas.sizeXY = 1/100; // rzTopMiniCupolas object sizeXY factor. Makes base into [X=1,Y=1].
	rzTopMiniCupolas.sizeZ	= 1/100; // rzTopMiniCupolas object sizeZ factor. Makes base into [Z=1].
	var sizeTopMiniCupolas = [sf/2,sf/2];
	var domainTopMiniCupolas = DOMAIN([[0,1],[0,PI*2]])([rzTopMiniCupolas.length,nRibs]);

	// rz's arrays instead of [X,Y,Z] have [Radius,Z] elements
	var rzSteps = [	[0,0], // [0,0] in order to have a closed object (at the top).
 									[baseStepsRadius,0], [baseStepsRadius, 0],
 									[baseStepsRadius,-baseStepsWidth], [baseStepsRadius, -baseStepsWidth],
 									[baseStepsRadius+baseStepsWidth, -baseStepsWidth], [baseStepsRadius+baseStepsWidth, -baseStepsWidth],
 									[baseStepsRadius+baseStepsWidth, -baseStepsWidth*2], [baseStepsRadius+baseStepsWidth, -baseStepsWidth*2],
 									[baseStepsRadius+baseStepsWidth*2, -baseStepsWidth*2], [baseStepsRadius+baseStepsWidth*2, -baseStepsWidth*2],
 									[baseStepsRadius+baseStepsWidth*2, -baseStepsWidth*3], [baseStepsRadius+baseStepsWidth*2, -baseStepsWidth*3],
 									[0, -baseStepsWidth*3], [0, -baseStepsWidth*3]]; // Closing the bottom of the Steps
	rzSteps.sizeXY = 1; // rzSteps object sizeXY factor. Makes base into [X=1,Y=1].
	rzSteps.sizeZ	= 1; // rzSteps object sizeZ factor. Makes base into [Z=1].
	var sizeSteps = [sf,sf];
	var domainSteps = DOMAIN([[0,1],[0,PI*2]])([rzSteps.length,nRibs*4]);
	var halfAlfaCupola = PI/nRibs; // The angle that contains one half of slice of the cupola

	// Colors definitions
	function ColorRGB(r,g,b,t) { t = t || 1; return new Array(r/0xFF,g/0xFF,b/0xFF, t); }
 	var colorGlass = [0,1,1,0.4];
 	var colorBiancoCarrara = ColorRGB(0xF6,0xFA,0xE1);
 	var colorMintedMarble = ColorRGB(0xF1,0xFC,0xC0);
 	var colorYellowMarble = ColorRGB(0xEB,0xE8,0x2D);
 	var colorYellowMarbleExt = ColorRGB(0xDB,0xD8,0x1D);
 	var colorGold = ColorRGB(0xFF, 0xE5, 0x00);
 	var colorWhiteMarble = ColorRGB(0xEE, 0xEA, 0xF7);

	// Each/some functions add their structures into the myModel array in order to "make a movie" of the building process 	
 	var myModel = new Array();
 	var myIdx=0;
 	var i;

	/* 
	** Phase 0. Declaration of all functions
	*/

	function RemapAdd(cp, pos)
	{ // Remap adding on 3 element vector
		return cp.map(function (p) {return [(p[0]+pos[0]), (p[1]+pos[1]), (p[2]+pos[2])]});
	}

	function RemapScale(cp, s)
	{ // Remap scaling on 3 element vector
		return cp.map(function (p) {return [(p[0]*s[0]), (p[1]*s[1]), (p[2]*s[2])]});
	}

	// Return an array that contain a polygon used to build the first floor
	function GetFloorProfile(fl)
	{
		var s2 = Math.sqrt(2)/2; // Half of square roots of 2
		fl = fl || 1; // floor parameter length

		return [[ (3/2+s2)*fl, fl/2,0],[ (1/2+s2)*fl, fl/2,0],[ fl/2, (1/2+s2)*fl,0],[ fl/2, (3/2+s2)*fl,0]]	// Only quadrant I
/*			[-fl/2, (3/2+s2)*fl,0],[-fl/2, (1/2+s2)*fl,0],[-(1/2+s2)*fl, fl/2,0],[-(3/2+s2)*fl, fl/2,0],	// Quadrant II
			[-(3/2+s2)*fl,-fl/2,0],[-(1/2+s2)*fl,-fl/2,0],[-fl/2,-(1/2+s2)*fl,0],[-fl/2,-(3/2+s2)*fl,0],	// Quadrant III
			[ fl/2,-(3/2+s2)*fl,0],[ fl/2,-(1/2+s2)*fl,0],[ (1/2+s2)*fl,-fl/2,0],[ (3/2+s2)*fl,-fl/2,0]]; // Quadrant IV
*/
	}

	/*
	** Build an nRot sized array composed by rotated by alfa*index
	*/
	function ArrayRotate( struct, nRot, alfa )
	{
		var i=1;
		var arrayRot = new Array();
		arrayRot[0] = struct;
	
		if ((nRot & (nRot-1)) == 0) // Is a power of two?
		{
			while ((1<<i)<=nRot)
			{
				arrayRot[i] = STRUCT([ arrayRot[i-1], R([0,1])([alfa*(1<<(i-1))])(arrayRot[i-1]) ]);
				i++;
			}
		}
		else
		{
			for (;i<nRot; i++)
			{
				arrayRot[i] = R([0,1])([alfa*i])(arrayRot[0]);
			}
		}
		return arrayRot;
	}

	function BuildKnots(len, degree)
	{
		// INPUT len:length
		// INPUT degree: spline degree.
		// OUTPUT knots: Array of integer describing spline's knots
		
		// knots = [0,0,0,1,...,n-1,n,n,n]
		degree = degree || 2; // Degree of NUBS
		var i;
		var d=len-degree;
		knots = new Array();
		
		for (i = 0; i<=degree; i++)
		{
			knots[i] = 0;
			knots[len+i] = d;
		}
		i = len - 1;
		for (i; i>degree; i--) knots[i] = i-degree;
		
		return knots;		
	}

	function CalcNUBS(ctrls, degree, sel, knots)
	{ // Generate a NUBS from a smaller number of argument
		// INPUT ctrls: Array of integer describing spline's control points.
		// INPUT degree: spline degree.
		// INPUT sel: domain coordinate selector function.
		// INPUT knots: Array of integer describing spline's knots
		// OUTPUT plasm model of the CUBOID built by passed parameters
		sel = sel || S0;
		degree = degree || ((knots)?((knots.length-ctrls.length+1)/2):2);
//		console.log(degree);
		knots = knots || BuildKnots(ctrls.length, degree);

		return NUBS(sel)(degree)(knots)(ctrls);
	}

	// Create a better looks for a trasparent CUBOID
	function MYCUBOID(dims)
	{ // Implemented only for 2 and 3 dimensions, for others then calls CUBOID()
		// INPUT dims: dimensions like CUBOID(dims)
		// OUTPUT plasm model of the CUBOID built by passed parameters
		var cuboid;
		var domain = DOMAIN([[0,1],[0,1]])([1,1]);
		var ndegree = 1;
		var nsel = S0;
		var bsel = S1;
		var b0,b1,b2,b3,b4,b5;

		switch(dims.length) {
			case 2: // Two dimension
				b0 = BEZIER(bsel)([ CalcNUBS([[0,0,0], [dims[0],0,0]], ndegree, nsel),
													CalcNUBS([[0,dims[1],0],[dims[0],dims[1],0]], ndegree, nsel) ]);
				cuboid = MAP(b0)(domain);
			break;
			case 3: // Three dimension
				b0 = BEZIER(bsel)([ CalcNUBS([[0,0,0], [dims[0],0,0]], ndegree, nsel),
														CalcNUBS([[0,dims[1],0],[dims[0],dims[1],0]], ndegree, nsel) ]);
				b1 = BEZIER(bsel)([ CalcNUBS([[0,0,0], [dims[0],0,0]], ndegree, nsel),
														CalcNUBS([[0,0,dims[2]],[dims[0],0,dims[2]]], ndegree, nsel) ]);
				b2 = BEZIER(bsel)([ CalcNUBS([[0,0,0], [0,dims[1],0]], ndegree, nsel),
														CalcNUBS([[0,0,dims[2]],[0,dims[1],dims[2]]], ndegree, nsel) ]);
				b3 = BEZIER(bsel)([ CalcNUBS([[0,dims[1],0], [dims[0],dims[1],0]], ndegree, nsel),
														CalcNUBS([[0,dims[1],dims[2]], [dims[0],dims[1],dims[2]]], ndegree, nsel) ]);
				b4 = BEZIER(bsel)([ CalcNUBS([[dims[0],0,0], [dims[0],dims[1],0]], ndegree, nsel),
														CalcNUBS([[dims[0],0,dims[2]], [dims[0],dims[1],dims[2]]], ndegree, nsel) ]);
				b5 = BEZIER(bsel)([ CalcNUBS([[0,0,dims[2]], [dims[0],0,dims[2]]], ndegree, nsel),
														CalcNUBS([[0,dims[1],dims[2]],[dims[0],dims[1],dims[2]]], ndegree, nsel) ]);

				cuboid = STRUCT([ MAP(b0)(domain), MAP(b1)(domain), MAP(b2)(domain),
												 MAP(b3)(domain), MAP(b4)(domain), MAP(b5)(domain)]);

			break;
			default:
				cuboid = CUBOID(dims);
			break;
		}
		return cuboid;
	}
	
	/* Build3DSurfaceFrom2DCurve() use rz to create one NUBS along Z axis that is
	** mapped over domain2.
	*/
	function Build3DSurfaceFrom2DCurve(rz, scale, domain2, degree, knots)
	{
		// INPUT rz: Array of [Radius,Z]. Is also an object containing sizeXY and sizeZ properties. Contains control points for NUBS, remember that first coordinate is radius and then Z...other coordinates are ignored ([[,]] not [[,,]]). First and last must have Radius=0 in order to have a closed object.
		// INPUT scale: Array of scale factor: is composed by scaleXY and scaleZ
		// INPUT domain2: Domain for BEZIER curve
		// INPUT knots: knots for NUBS
		// OUTPUT plasm model of the surface built by passed parameters

		// Check for INPUT, eventually fill with default values
		scale = scale || [1,1];
		domain2 = domain2 || DOMAIN([[0,1],[0,PI*2]])([rz.length*3,rz.length]); 

		var ctrls = AA(function(p) { return [p[0] * scale[0] * rz.sizeXY, 0, p[1] * scale[1] * rz.sizeZ] })(rz);
		var cc = CalcNUBS(ctrls,degree,S0,knots); // NUBS(S0)(((knots.length-ctrls.length+1)/2))(knots)(ctrls);
		var rs = ROTATIONAL_SURFACE(cc);
		var mrsd = MAP(rs)(domain2);
// console.log(ctrls);
		return mrsd;
	}

	/* FillTwoPolygons()
	** Creates an edge between the nth vertex in the first and the nth vertex in the second polygon,
	** and then fills these newly created faces.
	*/
	function FillTwoPolygons(p1,p2)
	{
		var n12 = new Array();
		var b12 = new Array();
		var domain = DOMAIN([[0,1],[0,1]])([1,1]);

		if (p1.length>=p2.length) // Work with heterogeneous polygons
		{
			p1.forEach( function (e,i) { 
				if (p2.length>i)
				{ // Create edge with the corresponding vertex of the other polygon
					n12[i] = CalcNUBS([e, p2[i]], 1, S0);
				}
				else
				{ // Create edge always with last vertex of the other polygon
					n12[i] = CalcNUBS([e, p2[p2.length-1]], 1, S0);
				}
			} );
		}
		else
		{
			p2.forEach( function (e,i) { 
				if (p2.length>i)
				{ // Create edge with the corresponding vertex of the other polygon
					n12[i] = CalcNUBS([e, p1[i]], 1, S0);
				}
				else
				{ // Create edge always with last vertex of the other polygon
					n12[i] = CalcNUBS([e, p1[p1.length-1]], 1, S0);
				}
			} );
		}

		n12.forEach( function (e,i,arr) { 
			b12[i] = MAP(BEZIER(S1)([e,arr[(i+1) % arr.length]]))(domain);
		} );
		
		return STRUCT(b12);
	}

	/* FillPolygon() creates an average point by the points of polygon and then 
	** creates an edge between this average point and all vertexes of the polygon,
	** and then fills these newly created faces.
	*/
	function FillPolygon(p)
	{
		/* Creates a polygon with the same number of vertices of the polygon p and 
		** in which all the vertices are coincident in the average of the vertices
		** of the polygon p. And then use FillTwoPolygons() to fill the polygon.
		*/
		if (p)
		{
			var avgPolygon = p.slice(0);
			var avgPoint = p[0].slice(0); // Get First vertex
	
			avgPoint.forEach( function (e,i,arr) { arr[i] = 0; } ); // Prepare average on points of the polygon p
			avgPolygon.forEach( function (e,i,arr) {	// For each point of the polygon p
				e.forEach( function (c,dim) { avgPoint[dim] += c/arr.length; } ); // Update the relative coordinate for each component of each point.
			} );
			avgPolygon.forEach( function (e,i,arr) { arr[i] = avgPoint;	} ); // Set the new polygon as sequence of the same point (avgPoint).
	
			return FillTwoPolygons( avgPolygon, p );
		}
		else
			return null;
	}

		
	/* FillPolys() combines a sequence of polygons two by two: 
	** creates an edge between the nth vertex in the first and the nth vertex in the second polygon,
	** and then fills these newly created faces. Furthermore, also fills the first and the last polygon.
	*/
	function FillPolys(fp)
	{ 
		// INPUT fp: Array of polygons. // Points of each polygon have to be right-handed respect to its normal
		// OUTPUT plasm model

		fp = fp ||	[ [[1,1,1.8], [2,1,1.8], [2,2,1.8], [1,2,1.8]],
									[[0.5,0.5,2], [2.5,0.5,2], [2.5,2.5,2], [0.5,2.5,2]],
									[[0,0,2], [3,0,2], [3,3,2], [0,3,2]],
									[[0,0,0], [3,0,0], [3,3,0], [0,3,0]],
									[[0.5,0.5,0], [2.5,0.5,0], [2.5,2.5,0], [0.5,2.5,0]],
									[[1,1,0.2], [2,1,0.2], [2,2,0.2], [1,2,0.2]]];

		if (fp && fp.length>=1)
		{
			var surfArray = new Array;
			var iSurf = 0;

			// Calc each join between adiancent poly in fp[], included the two "added" new polygons for first (newPolyFirst) and for last (newPolyLast)
			surfArray[iSurf++] = FillPolygon(fp[0]);
			if (fp.length>1)
			{
				for (; iSurf<fp.length; iSurf++)
				{
					surfArray[iSurf] = FillTwoPolygons(fp[iSurf-1],fp[iSurf]);
				}
				surfArray[iSurf++] = FillPolygon(fp[fp.length-1]);
			}
			return STRUCT(surfArray);
		}
		else
		{
			return null;
		}
	}

	var last_h_cupola=-1; // outside variable to know the high of the last built cupola (the real high)
	var last_r_cupola=-1; // outside variable to know the last (minimal, at the top of the cupola) radius of the last built cupola
	function BuildRibbedCupola(nRibs, cRibs, cupolaType, baseRadium, cww, percentage, argDomain, zBaseCupola)
	{ // Keep in mind that the base occupy a radium larger than baseRadium: baseRadium+6*cww/2 (at ribs...)
		// INPUT nRibs: Number of faces for cupola.
		// INPUT cRibs: Number of faces really built.
		// INPUT cupolaType: Heigth factor for cupola: cupolaType==1 for Round Arch, cupolaType==2 for Equilateral Arch.
		// INPUT baseRadium: Radium of the inscribed circle at the base of the cupola.
		// INPUT cww: Cupola wall's width
		// INPUT percentage: percentage of completeness of the base starting from the base (1.0 (100%) means closed on top).
		// INPUT argDomain: domain argument for vertical face
		// INPUT zBaseCupola: Elevation of the base of the cupola
		// OUTPUT a ribbed cupola array of plasm model built by passed parameters, and two outside parameters (last_h_cupola and last_r_cupola)

		// Check inputs, and eventually set a default value.
		nRibs = nRibs || 8; // default is eight faces
		cRibs = cRibs || nRibs; // by default complete cupola
		cupolaType = cupolaType || 1; 
		baseRadium = baseRadium || 1;
		cww = cww || 0.3;
		percentage = percentage || 0.8;
		argDomain = argDomain || 20;

		var alfa = 2*PI/nRibs; // The angle that contains one slice of the cupola
		var halfAlfa = alfa/2; // An half of the angle of a slice of the cupola
		var domainCupola = DOMAIN([[0,1],[0,alfa]])([argDomain,1]); // Domain used to create one slice of an emisphere, the profile used (cpCupola) could be cutted at the top (depending by percentage), the slice goes from 0 to alfa degree
		var angleType = Math.acos(1-1/cupolaType); // PI/2 for Round Arch, PI/3 for Equilateral Arch
		var rCupola = baseRadium*(1 + cupolaType*(Math.cos(angleType*percentage) - 1)); // Simplified equation that calculate the radium at the cut of the top of the cupola surface (without ribs)
		var hCupola = baseRadium*cupolaType*Math.sin(angleType*percentage);
		var cpCupola = [[baseRadium,0,0],
										[baseRadium*(1 + cupolaType*(Math.cos(angleType*percentage/2) - 1)),0,baseRadium*cupolaType*Math.sin(angleType*percentage/2)],
										[rCupola,0,hCupola]]; // Control points to create the (eventually cutted) emisphere.

		var hTopCupola = cww/2;
		last_h_cupola = zBaseCupola+baseRadium/4+hTopCupola + hCupola; // Value used outside this function too. Set the maximum Z reached by this building
		last_r_cupola = rCupola + 5.5*cww/2; // Value used outside this function too. Set the radius at Z == last_h_cupola
	
		var profileCupola = CalcNUBS(cpCupola);
		var mappingCupola = ROTATIONAL_SURFACE(profileCupola);

		// Internal viewing part of the curved cupola slice
		var cupola = T([0,1])([cww*Math.cos(halfAlfa),cww*Math.sin(halfAlfa)])(COLOR(colorYellowMarble)(MAP(mappingCupola)(domainCupola)));
		// External viewing part of the curved cupola slice
		var cupolaExt = T([0,1])([cww*Math.cos(halfAlfa),cww*Math.sin(halfAlfa)])(COLOR(colorYellowMarbleExt)(cupola));
		
		// The ribs are created half at the left and half at the right of one cupola slice: in that manner it is possible to create a semi-cupola (PI degree).
		// Calculate the profile of 
		var profileCupolaRib0 = CalcNUBS(RemapAdd(cpCupola, [cww/2*Math.cos(halfAlfa),cww/2*Math.sin(halfAlfa),0]));
		var profileCupolaRib1 = CalcNUBS(RemapAdd(cpCupola, [5*cww/2*Math.cos(halfAlfa),5*cww/2*Math.sin(halfAlfa),0]));
		var profileCupolaRib2 = CalcNUBS(RemapAdd(cpCupola, [5.5*cww/2,0,0]));
		var profileCupolaRib3 = CalcNUBS(RemapAdd(cpCupola, [cww/2,0,0]));

		var domainRib = DOMAIN([[0,1],[0,1]])([argDomain,1]);
		var rib0 = MAP(BEZIER(S1)([profileCupolaRib0, profileCupolaRib1]))(domainRib);
		var rib1 = MAP(BEZIER(S1)([profileCupolaRib1, profileCupolaRib2]))(domainRib);
		var rib2 = MAP(BEZIER(S1)([profileCupolaRib2, profileCupolaRib3]))(domainRib);
		var rib3 = MAP(BEZIER(S1)([profileCupolaRib3, profileCupolaRib0]))(domainRib);
		var ribDx = STRUCT([ rib0, rib1, rib3 ]); // rib2 must be only one...
		var ribSx = R([0,1])([alfa])(S([1])([-1])(ribDx));
		var rib = COLOR(colorBiancoCarrara)(STRUCT([ribDx, rib2, ribSx]));
		//DRAW(rib);

		var cpBaseCupola = [[baseRadium+cww/2,0,0], [baseRadium+7*cww/2,0,0], [baseRadium+7*cww/2,0,0],
										[baseRadium+7*cww/2,0,-baseRadium/10],[baseRadium+6*cww/2,0,-baseRadium/10],
										[baseRadium+6*cww/2,0,-baseRadium/9],[baseRadium+6.5*cww/2,0,-baseRadium/9],
										[baseRadium+6.5*cww/2,0,-baseRadium/10*2],[baseRadium+6*cww/2,0,-baseRadium/10*2],
										[baseRadium+6*cww/2,0,-baseRadium/4],[baseRadium+cww/2,0,-baseRadium/4],
										[baseRadium+cww/2,0,-baseRadium/4],[baseRadium+cww/2,0,0]];
	
		var profileBaseCupola = CalcNUBS(cpBaseCupola);
		var mappingBaseCupola = ROTATIONAL_SURFACE(profileBaseCupola);
		var baseCupola = COLOR(colorBiancoCarrara)(MAP(mappingBaseCupola)(domainCupola));

		var cpTopCupola = [	[rCupola,0,hCupola],
												[last_r_cupola,0,hCupola], [last_r_cupola,0,hCupola],
												[last_r_cupola,0,hCupola + hTopCupola],[last_r_cupola,0,hCupola + hTopCupola],
												[rCupola,0,hCupola + hTopCupola],[rCupola,0,hCupola + hTopCupola],
												[rCupola,0,hCupola]];
	
		var profileTopCupola = CalcNUBS(cpTopCupola);
		var mappingTopCupola = ROTATIONAL_SURFACE(profileTopCupola);
		var topCupola = COLOR(colorBiancoCarrara)(MAP(mappingTopCupola)(domainCupola));

		return ArrayRotate( T([2])([zBaseCupola+baseRadium/4])(STRUCT([ baseCupola, cupola, cupolaExt, rib , topCupola ])), cRibs, alfa);
	}

	function BuildWallPiece(radiusMin, radiusMax, height, halfAngle)
	{
		var par0 = 0.8;
		var par1 = 0.05*sf;
		var par2 = radiusMax/radiusMin;
		var lx = radiusMin*Math.cos(halfAngle);
		var ly = radiusMin*Math.sin(halfAngle);
		var pIntFace = [	[ lx,-ly,-height/2],
											[ lx, ly,-height/2],
											[ lx, ly,height/2],
											[ lx,-ly,height/2]];

		if (simplify)
		{
			var pp3 = RemapScale(pIntFace, [par2, par2, 1]);
		
			return T([2])([height/2])(FillPolys([pIntFace, pp3]));
		}
		else
		{
			var pp1 = RemapScale(pIntFace, [1, par0, par0]);
			var pp2 = RemapAdd(RemapScale(pp1,	[1, par0, par0]), [ par1, 0, 0]);
			var pp3 = RemapScale(pIntFace, [par2, par2, 1]);
			var pp4 = RemapScale(pp3,					 [1, par0, par0]);
			var pp5 = RemapAdd(RemapScale(pp4,	[1, par0, par0]), [-par1, 0, 0]);
		
			//	return T([2])([height/2])(R([0,1])([2*PI/nRibs/2])(FillPolys([pp2, pp1, pIntFace, pp3, pp4, pp5])));
			return T([2])([height/2])(FillPolys([pp2, pp1, pIntFace, pp3, pp4, pp5]));
		}
	}

	/*
	** For first create all structures, then insert into the model, then make a show viewing building steps
	*/

	/*
	** Phase 1. Building of the structures
	*/

	// The base of all: the steps
	var steps = Build3DSurfaceFrom2DCurve(rzSteps,sizeSteps,domainSteps);

	// The "decorative" columns under main cupola
	var columnArray = new Array;
	
	var columnBaseAngle = 0; // PI/4

	if ((nDivCol & (nDivCol-1)) == 0)	// Is a power of two?
	{ // logaritmic...
		columnArray[0] = COLOR(colorWhiteMarble)(R([0,1])([columnBaseAngle])(T([0,1])([-cww*1.5/2,-cww*1.5/2])(MYCUBOID([cww*1.5,cww*1.5,hColumnBrick]))));
		i = 1;
		while ((1<<i)<=nDivCol)
		{
			columnArray[i] = COLOR(colorWhiteMarble)(STRUCT([ columnArray[i-1], T([2])([hColumnBrick*(1<<(i-1))])(R([0,1])([PI/nDivCol/2*(1<<(i-1))])(columnArray[i-1])) ]));
			i++;
		}
	}
	else
	{ // linear...
		for (i=0; i<nDivCol; i++)
			columnArray[i] = T([2])([hColumnBrick*i])(R([0,1])([PI/nDivCol/2*i + columnBaseAngle])(
					T([0,1])([-cww*1.5/2,-cww*1.5/2])(MYCUBOID([cww*1.5,cww*1.5,hColumnBrick]))));
	}
	var column = STRUCT(columnArray); // Create a one plasm model for column: the subsequent are inserted whole into myModel

	//	Walls
	var floorProfileInternal = (1-floorProfileScale)*floorProfileLength;

	/*
	** pe1..pe4 is the external polygon
	** pi1..pi4 is the internal polygon
	** pe1h is the (completed) external polygon elevated by Z=hFloor1
	** pi1h is the (completed) internal polygon elevated by Z=hFloor1
	*/
	var pe1 = GetFloorProfile(floorProfileLength);
	var pi1 = RemapAdd(pe1, [-floorProfileInternal,-floorProfileInternal,0]);
	var internalOffsetX = pi1[1][0];
	var internalOffsetY = -pi1[1][1];
	var extentY = 2*pi1[1][1];
	var extentX = ((pi1[0][0]-pi1[1][0]) -pi1[0][1]*2);

	var pe2 = RemapScale(pe1, [-1,1,1]);
	var pi2 = RemapScale(pi1, [-1,1,1]);
	pe2.reverse(); // Reverse order, in that way the points respect the right hand rule.
	pi2.reverse();

	var pe3 = RemapScale(pe1, [-1,-1,1]);
	var pi3 = RemapScale(pi1, [-1,-1,1]);

	var pe4 = RemapScale(pe2, [-1,-1,1]);
	var pi4 = RemapScale(pi2, [-1,-1,1]);
	
	pe2.forEach( function(e) { pe1.push(e) } );
	pe3.forEach( function(e) { pe1.push(e) } );
	pe4.forEach( function(e) { pe1.push(e) } );
	// at this point pe1 contains all points of external perimeter

	pi2.forEach( function(e) { pi1.push(e) } );
	pi3.forEach( function(e) { pi1.push(e) } );
	pi4.forEach( function(e) { pi1.push(e) } );
	// at this point pi1 contains all points of internal perimeter
	
	var pe1h = RemapAdd(pe1, [0,0,hFloor1]);
	var pi1h = RemapAdd(pi1, [0,0,hFloor1]);

	var closeRoof1 = T([0,1])([internalOffsetX, internalOffsetY])
										(STRUCT([ CUBOID([extentX, extentY, hFloor1]),
															T([0])([extentX])(CUBOID([extentY/6, extentY/6, hFloor1])),
															T([0,1])([extentX,extentY*5/6])(CUBOID([extentY/6, extentY/6, hFloor1])) ]) );
	
	// Cannot use FillPolys() because there is the hole in the middle!
	var floor1Base = COLOR(colorWhiteMarble)(
											STRUCT([	FillTwoPolygons(pi1, pi1h), FillTwoPolygons(pi1h, pe1h), 
																FillTwoPolygons(pe1h, pe1), FillTwoPolygons(pe1, pi1) ]) );

	var floorCloseRoof = COLOR(colorWhiteMarble)(
											STRUCT([	// Insert some structures to fill the roof
																 closeRoof1,
																 R([0,1])([PI/2])(closeRoof1),
																 R([0,1])([PI])(closeRoof1),
																 R([0,1])([3*PI/2])(closeRoof1) ]) );

	// Create the base walls
	var baseWalls = null;
	if (simplify)
	{
		//Just extend the roof...
		baseWalls = T([2])([(zBaseCupola-hFloor1)/2])(S([2])([(zBaseCupola-hFloor1)/hFloor1])(T([2])([-hFloor1/2])(floor1Base)));
	}
	else
	{ // TODO: DO THE SAME OF SIMPLIFIED...
		//Just extend the roof...
		baseWalls = T([2])([(zBaseCupola-hFloor1)/2])(S([2])([(zBaseCupola-hFloor1)/hFloor1])(T([2])([-hFloor1/2])(floor1Base)));
	}

	// The main cupola
	var mainCupolaArray = BuildRibbedCupola(nRibs, nRibs, typeMainCupola, radiusMainCupola, cww, 0.8, 20, zBaseCupola + hWallMainCupola);
	var hMainCupola = last_h_cupola;
	var rMainCupola = last_r_cupola;
		
	var pieceWallMain = BuildWallPiece(radiusMainCupola, (radiusMainCupola+cww*3), hWallMainCupola, PI/nRibs);

	var wallMainCupolaArray = ArrayRotate( pieceWallMain, nRibs, PI/nRibs*2 );
	
	// The cupola that is placed above main cupola	
	var expCupolaArray = BuildRibbedCupola(nRibs*2, nRibs*2, typeExpCupola, rMainCupola - 5.5/2*cww * 0.92, cww/2, 1, 10, hMainCupola);
	var hExpCupola = last_h_cupola;
	var rExpCupola = last_r_cupola;

	// The cross at the top of the main cupola
	var crossBase = COLOR(colorGlass)(T([0,1,2])([-0.5, -0.5, 1])(MYCUBOID([1,1,4])));
	var crossCube = COLOR(colorGlass)(T([0,1,2])([-0.5, -0.5, 5])(MYCUBOID([1,1,1])));
	var cross = STRUCT([ crossBase, crossCube, T([0])([1])(crossCube), T([0])([-1])(crossCube), T([2])([1])(crossCube) ]);
	var crossBase = COLOR(colorGold)(STRUCT([	T([0,1])([-1.5, -1.5])(CUBOID([3,3,1])), T([0,1,2])([-1.5, -1.5, 1])(CUBOID([3,1,2])),
				T([0,1,2])([-1.5, 0.5, 1])(CUBOID([3,1,2])),	T([0,1,2])([-1.5, -0.5, 1])(CUBOID([1,1,2])),	T([0,1,2])([0.5, -0.5, 1])(CUBOID([1,1,2])) ]) );

	// The minor cupola that will be replicated
	var miniCupolaArray = BuildRibbedCupola(nRibs, nRibs, typeMiniCupola, radiusMiniCupola, cww*0.75, 0.8, 20, zBaseCupola + hWallMiniCupola);
	var hMiniCupola = last_h_cupola;
	var rMiniCupola = last_r_cupola;

	var pieceWallMini = R([0,1])([PI/nRibs])(BuildWallPiece(radiusMiniCupola, (radiusMiniCupola+cww*3*0.75), hWallMiniCupola, PI/nRibs));

	var wallMiniCupolaArray = ArrayRotate( pieceWallMini, nRibs, PI/nRibs*2 );

	// The top of mini cupola
	var miniTopCupolas = Build3DSurfaceFrom2DCurve(rzTopMiniCupolas,sizeTopMiniCupolas,domainTopMiniCupolas);
	miniCupolaArray.push(COLOR(colorGold)(T([2])([hMiniCupola])(miniTopCupolas))); // Insert Top for mini cupola at the end of miniCupolaArray

	// Create a one plasm model for miniCupola: the subsequent are inserted whole into myModel
	var miniCupola = STRUCT([ STRUCT(miniCupolaArray), T([2])([zBaseCupola])(STRUCT(wallMiniCupolaArray)) ]); 


	/*
	** Phase 2. Insert into plasm model. Scale and place each structure.
	*/

	// Insert steps
	//if (doShow)
	{ // For debugging reason insert the steps only in show mode (final mode!)
		myModel[myIdx++] = COLOR(colorMintedMarble)(steps);
	}

	// First column is inserted piece by piece for the show
	var nCols = 4;
	var angleFirstColumn = PI/4;
	columnArray.forEach( function (e) { 
			myModel[myIdx++] = T([0,1])	([	columnRadius*Math.cos(angleFirstColumn), 
																			columnRadius*Math.sin(angleFirstColumn)])
																	(R([0,1])([angleFirstColumn])(column));
		} ); // traslate and push all elements of columnArray[] into myModel[]

	// Insert all other columns
	for (i=1;i<nCols; i++) // First column is already inserted into myModel
	{
		myModel[myIdx++] = T([0,1])	([	columnRadius*Math.cos(PI*2/nCols*i+angleFirstColumn), 
																	columnRadius*Math.sin(PI*2/nCols*i+angleFirstColumn)])
																(R([0,1])([PI*2/nCols*i+angleFirstColumn])(column));
	}

/*	for (i=0;i<nCols; i++) // mini cupola columns
	{
		myModel[myIdx++] = T([0,1])	([	(miniCupolaDispose/Math.sin(PI/4) - radiusMiniCupola)*Math.cos(PI*2/nCols*i+angleFirstColumn), 
																		(miniCupolaDispose/Math.sin(PI/4) - radiusMiniCupola)*Math.sin(PI*2/nCols*i+angleFirstColumn)])
																(R([0,1])([PI*2/nCols*i+angleFirstColumn])(column));
	}*/

	// Insert base wall // TODO
	if (baseWalls)
		myModel[myIdx++] = R([0,1])([PI/4])(baseWalls);

	// Insert floor 1 base
	myModel[myIdx++] = T([2])([zBaseCupola-hFloor1])(R([0,1])([PI/4])(STRUCT([floor1Base, floorCloseRoof])));
	// Wall of main cupola
	wallMainCupolaArray.forEach( function (e) { myModel[myIdx++] = T([2])([zBaseCupola])(e) } ); // push all elements of wallMainCupolaArray[] into myModel[]
	// Wall of mini cupola
	wallMiniCupolaArray.forEach( function (e) { 
			myModel[myIdx++] = T([0,1,2])([-miniCupolaDispose,-miniCupolaDispose, zBaseCupola])(R([0,1])([PI+halfAlfaCupola])(e));
		} ); // roto-traslate and push all elements of miniCupolaArray[] into myModel[]

	// Insert all parts of first mini cupolas
	miniCupolaArray.forEach( function (e) { 
			myModel[myIdx++] = T([0,1])([-miniCupolaDispose,-miniCupolaDispose])(R([0,1])([PI+halfAlfaCupola])(e));
		} ); // roto-traslate and push all elements of miniCupolaArray[] into myModel[]

	// Insert all other mini cupolas (one by one...)
	myModel[myIdx++] = T([0,1])([-miniCupolaDispose, miniCupolaDispose])(R([0,1])([PI/2+halfAlfaCupola])(miniCupola));
	myModel[myIdx++] = T([0,1])([ miniCupolaDispose, miniCupolaDispose])(R([0,1])([PI/4+halfAlfaCupola])(miniCupola));
	myModel[myIdx++] = T([0,1])([ miniCupolaDispose,-miniCupolaDispose])(R([0,1])([3*PI/2+halfAlfaCupola])(miniCupola));

	// Insert main cupola
	mainCupolaArray.forEach( function (e) { myModel[myIdx++] = R([0,1])([halfAlfaCupola])(e) } ); // push all elements of mainCupolaArray[] into myModel[]

	// Insert expCupola
	expCupolaArray.forEach( function (e) { myModel[myIdx++] = R([0,1])([halfAlfaCupola])(e) } ); // push all elements of expCupolaArray[] into myModel[]

	// Insert the cross on top of main cupola
	myModel[myIdx++] = T([2])([hExpCupola])(S([0,1,2])([sf*0.1, sf*0.1, sf*0.1])(STRUCT([ crossBase, cross ])));

	/*
	** Phase 3. Show the result
	*/

	var showIdx = -1;
	var drawModel = new Array();
	
	if (doShow)
	{
		for (i = 0; i<myIdx; i++)
		{
			drawModel[i] = DRAW( myModel[i] );
			HIDE( drawModel[i] );
		}
	}

	function doDeClock(time)
	{	// Run after that the function including this will exit
		if (showIdx > 0)
		{
			CANCEL( drawModel[--showIdx] );
			if (showIdx>0)
			{
				if (ctrl)
				{
					ctrl.object.position.x-=1;
					ctrl.object.position.z+=0.5;
				}
				setTimeout("doDeClock(time)",time);
			}
			else
			{
				SHOW(m);
				if (ctrl) ctrl.viewAll();
			}
		}
	}
	
	function doClock(time)
	{	// After first time this function will run after that the function including this will exit
		if (showIdx == -1)
		{
			showIdx++;
		}
		else
		{
			if (showIdx == 0)
			{
				HIDE(m);
			}
			if (showIdx < myIdx)
			{
				SHOW( drawModel[showIdx++] );
				if (ctrl)
				{
					ctrl.object.position.x+=1;
					ctrl.object.position.z-=0.5;
				}
			}
		}
		if (showIdx < myIdx)
		{
			setTimeout("doClock(time)",time);
		}
		else
			setTimeout("doDeClock(time)",time);
	}

	var time = 500; // Used by the second time...

	var model = STRUCT(myModel);
	DRAW(model);
	SHOW(model);
	if (ctrl) ctrl.viewAll();

	exports.m =	model;
	if (doShow)
	{
		exports.doClock =	doClock; // Run after that this function will exit
		exports.doDeClock =	doDeClock; // Run after that this function will exit
		exports.time =	time; // Used after that this function will exit
	}
	exports.ctrl =	ctrl; // Used after that this function will exit
	exports.showIdx =	showIdx; // DEBUG
	exports.myModel = myModel;      // Added 2012 06 22 to redo animation
	exports.drawModel = drawModel;  // Added 2012 06 22 to redo animation
	exports.myIdx = myIdx;          // Added 2012 06 22 to redo animation

	if (doShow)
	{
		if (ctrl)
		{
			ctrl.object.position.x = -ctrl.object.position.x - 10;
			ctrl.object.position.y = -ctrl.object.position.y - 10;
		}
		console.log('Start...');
		doClock(3000); // engage the sequence after ms
	}
	
}(this)) // "this" often is window (global variable)
