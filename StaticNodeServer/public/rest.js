function Hello($scope, $http)
{
	$http({method: 'GET', url: 'http://angulardemo-21580.onmodulus.net/test'}).
	success(function(data)
	{
		console.log('good');
		$scope.companies = data;
		console.log(data);
	}).
	error(function(data)
	{
		console.log('bad');
		$scope.companies = 'error';
	});
}